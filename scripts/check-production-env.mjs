import { pathToFileURL } from 'node:url'

function clean(env, name) {
  return typeof env[name] === 'string' ? env[name].trim() : ''
}

function validateUrl(errors, name, rawValue, protocols, required = false) {
  if (!rawValue) {
    if (required) errors.push(`${name} não está definida`)
    return
  }

  try {
    const url = new URL(rawValue)
    if (!protocols.includes(url.protocol)) {
      errors.push(`${name} deve usar ${protocols.join(' ou ')}`)
    }
    if (name === 'NEXT_PUBLIC_SITE_URL' && (url.pathname !== '/' || url.search || url.hash)) {
      errors.push('NEXT_PUBLIC_SITE_URL deve conter somente a origem, sem caminho, query ou fragmento')
    }
  } catch {
    errors.push(`${name} não é uma URL válida`)
  }
}

export function validateProductionEnv(env = process.env) {
  const errors = []
  const warnings = []

  const databaseUrl = clean(env, 'DATABASE_URL')
  validateUrl(errors, 'DATABASE_URL', databaseUrl, ['mongodb:', 'mongodb+srv:'], true)

  const siteUrl = clean(env, 'NEXT_PUBLIC_SITE_URL')
  validateUrl(errors, 'NEXT_PUBLIC_SITE_URL', siteUrl, ['https:'], true)

  const provider = clean(env, 'AI_PROVIDER')
  if (provider !== 'gemini' && provider !== 'openai') {
    errors.push('AI_PROVIDER deve ser gemini ou openai')
  } else if (provider === 'gemini' && !clean(env, 'GOOGLE_GENERATIVE_AI_API_KEY')) {
    errors.push('GOOGLE_GENERATIVE_AI_API_KEY é obrigatória para AI_PROVIDER=gemini')
  } else if (provider === 'openai' && !clean(env, 'OPENAI_API_KEY')) {
    errors.push('OPENAI_API_KEY é obrigatória para AI_PROVIDER=openai')
  }

  const redisUrl = clean(env, 'UPSTASH_REDIS_REST_URL')
  const redisToken = clean(env, 'UPSTASH_REDIS_REST_TOKEN')
  if (Boolean(redisUrl) !== Boolean(redisToken)) {
    errors.push('UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN devem ser configuradas juntas')
  } else if (redisUrl) {
    validateUrl(errors, 'UPSTASH_REDIS_REST_URL', redisUrl, ['https:'])
  } else {
    warnings.push('Redis não configurado; o rate limit ficará local a cada processo')
  }

  const trustProxy = clean(env, 'TRUST_PROXY')
  if (trustProxy !== 'true') {
    errors.push('TRUST_PROXY deve ser true em produção; publique o Next somente atrás de um proxy confiável que saneie os headers encaminhados')
  }

  const allowedOrigins = clean(env, 'ALLOWED_ORIGINS')
  for (const [index, origin] of allowedOrigins.split(',').map((value) => value.trim()).filter(Boolean).entries()) {
    validateUrl(errors, `ALLOWED_ORIGINS[${index}]`, origin, ['https:'])
  }

  const capacitorUrl = clean(env, 'CAPACITOR_SERVER_URL')
  validateUrl(errors, 'CAPACITOR_SERVER_URL', capacitorUrl, ['https:'])

  if (clean(env, 'OWNER_PASSWORD')) {
    warnings.push('OWNER_PASSWORD ainda está presente; remova-a do ambiente após a migração')
  }

  return { errors, warnings }
}

function main() {
  const { errors, warnings } = validateProductionEnv()

  for (const warning of warnings) console.warn(`[ENV WARNING] ${warning}`)
  if (errors.length > 0) {
    for (const error of errors) console.error(`[ENV ERROR] ${error}`)
    console.error(`Configuração de produção inválida: ${errors.length} erro(s).`)
    process.exitCode = 1
    return
  }

  console.log('Configuração de produção válida.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
