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

function validateDatabaseUrl(errors, rawValue) {
  if (!rawValue) {
    errors.push('DATABASE_URL não está definida')
    return
  }

  try {
    const url = new URL(rawValue)
    if (url.protocol !== 'mongodb:' && url.protocol !== 'mongodb+srv:') {
      errors.push('DATABASE_URL deve usar mongodb: ou mongodb+srv:')
      return
    }

    const tlsValues = [...url.searchParams.entries()]
      .filter(([name]) => name.toLowerCase() === 'tls' || name.toLowerCase() === 'ssl')
      .map(([, value]) => value.toLowerCase())

    if (url.protocol === 'mongodb+srv:') {
      // SRV habilita TLS por padrão, mas uma opção explícita nunca pode desativá-lo.
      if (tlsValues.some((value) => value !== 'true')) {
        errors.push('DATABASE_URL mongodb+srv não pode desativar TLS/SSL')
      }
      return
    }

    // Em mongodb:// o transporte seguro não é implícito: exigimos uma opção
    // afirmativa e recusamos combinações conflitantes como tls=true&ssl=false.
    if (tlsValues.length === 0 || tlsValues.some((value) => value !== 'true')) {
      errors.push('DATABASE_URL mongodb deve declarar tls=true ou ssl=true')
    }
  } catch {
    errors.push('DATABASE_URL não é uma URL válida')
  }
}

function validateStorage(errors, env) {
  const requiredNames = [
    'STORAGE_ENDPOINT',
    'STORAGE_BUCKET',
    'STORAGE_ACCESS_KEY_ID',
    'STORAGE_SECRET_ACCESS_KEY',
  ]
  const configuredNames = requiredNames.filter((name) => Boolean(clean(env, name)))
  const publicBaseUrl = clean(env, 'STORAGE_PUBLIC_BASE_URL')
  const storageRequested = configuredNames.length > 0 || Boolean(publicBaseUrl)

  if (storageRequested && configuredNames.length !== requiredNames.length) {
    errors.push(`${requiredNames.join(', ')} devem ser configuradas juntas`)
  }

  const endpoint = clean(env, 'STORAGE_ENDPOINT')
  if (endpoint) validateUrl(errors, 'STORAGE_ENDPOINT', endpoint, ['https:'])
  if (publicBaseUrl) validateUrl(errors, 'STORAGE_PUBLIC_BASE_URL', publicBaseUrl, ['https:'])
}

export function validateProductionEnv(env = process.env) {
  const errors = []
  const warnings = []

  const databaseUrl = clean(env, 'DATABASE_URL')
  validateDatabaseUrl(errors, databaseUrl)

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

  // Firebase Admin (Firestore): obrigatório em produção — as análises bíblicas
  // e os tokens de push dependem dele. Sem estas variáveis, as rotas de IA que
  // gravam no Firestore falham em runtime (app/invalid-credential).
  for (const name of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
    if (!clean(env, name)) {
      errors.push(`${name} é obrigatória em produção (Firebase Admin / Firestore)`)
    }
  }
  const firebasePrivateKey = clean(env, 'FIREBASE_PRIVATE_KEY')
  if (firebasePrivateKey && !firebasePrivateKey.includes('PRIVATE KEY')) {
    errors.push('FIREBASE_PRIVATE_KEY não parece ser uma chave privada válida (esperado o bloco "-----BEGIN PRIVATE KEY-----" com quebras \\n)')
  }

  const redisUrl = clean(env, 'UPSTASH_REDIS_REST_URL')
  const redisToken = clean(env, 'UPSTASH_REDIS_REST_TOKEN')
  if (Boolean(redisUrl) !== Boolean(redisToken)) {
    errors.push('UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN devem ser configuradas juntas')
  } else if (redisUrl) {
    validateUrl(errors, 'UPSTASH_REDIS_REST_URL', redisUrl, ['https:'])
  } else {
    // Sem Redis o rate limit é local a cada processo: em produção distribuída
    // (múltiplas instâncias) isso não protege contra abuso. É bloqueador, não aviso.
    errors.push('UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN são obrigatórias em produção; sem Redis o rate limit fica local a cada processo e não protege múltiplas instâncias')
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

  const cronSecret = clean(env, 'CRON_SECRET')
  if (!cronSecret) {
    errors.push('CRON_SECRET é obrigatória em produção')
  } else if (cronSecret.length < 32) {
    errors.push('CRON_SECRET deve ter pelo menos 32 caracteres')
  }

  validateStorage(errors, env)

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
