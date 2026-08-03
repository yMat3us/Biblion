import { describe, expect, it } from 'vitest'
import { validateProductionEnv } from '@/scripts/check-production-env.mjs'

// Ambiente de produção mínimo e válido, usado como base para as variações.
const validProductionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb+srv://db.example.invalid/biblion',
  NEXT_PUBLIC_SITE_URL: 'https://biblion.example.invalid',
  TRUST_PROXY: 'true',
  AI_PROVIDER: 'gemini',
  GOOGLE_GENERATIVE_AI_API_KEY: 'ci-placeholder',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'ci-placeholder', // gitleaks:allow
  CRON_SECRET: 'fake-32-char-cron-secret-for-test!', // gitleaks:allow
}

/** Clona a base de produção removendo as chaves indicadas (sem variáveis órfãs). */
function envWithout(...keys: string[]): NodeJS.ProcessEnv {
  const clone: NodeJS.ProcessEnv = { ...validProductionEnv }
  for (const key of keys) delete clone[key]
  return clone
}

function envWith(values: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return { ...validProductionEnv, ...values } as NodeJS.ProcessEnv
}

describe('validateProductionEnv — contrato de produção', () => {
  it('aprova um ambiente de produção completo (Redis incluído)', () => {
    const { errors } = validateProductionEnv(validProductionEnv)
    expect(errors).toEqual([])
  })

  it('exige Redis em produção como erro, não como aviso', () => {
    const { errors, warnings } = validateProductionEnv(
      envWithout('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'),
    )

    expect(errors.some((error: string) => error.includes('UPSTASH_REDIS'))).toBe(true)
    // Não pode mais degradar silenciosamente para aviso.
    expect(warnings.some((warning: string) => warning.toLowerCase().includes('redis'))).toBe(false)
  })

  it('ainda rejeita configuração parcial de Redis (só URL ou só token)', () => {
    const { errors } = validateProductionEnv(envWithout('UPSTASH_REDIS_REST_TOKEN'))
    expect(errors.some((error: string) => error.includes('devem ser configuradas juntas'))).toBe(true)
  })

  describe('DATABASE_URL', () => {
    it('aceita mongodb+srv sem parâmetro TLS explícito', () => {
      const { errors } = validateProductionEnv(
        envWith({ DATABASE_URL: 'mongodb+srv://db.example.invalid/biblion?retryWrites=true' }),
      )
      expect(errors).toEqual([])
    })

    it.each([
      'mongodb://db.example.invalid/biblion?tls=true',
      'mongodb://db.example.invalid/biblion?ssl=true',
      'mongodb://db.example.invalid/biblion?TLS=TRUE',
    ])('aceita conexão mongodb com TLS explícito: %s', (databaseUrl) => {
      const { errors } = validateProductionEnv(envWith({ DATABASE_URL: databaseUrl }))
      expect(errors).toEqual([])
    })

    it.each([
      'mongodb://db.example.invalid/biblion',
      'mongodb://db.example.invalid/biblion?tls=false',
      'mongodb://db.example.invalid/biblion?tls=true&ssl=false',
      'mongodb+srv://db.example.invalid/biblion?tls=false',
    ])('rejeita conexão MongoDB que possa trafegar sem TLS: %s', (databaseUrl) => {
      const { errors } = validateProductionEnv(envWith({ DATABASE_URL: databaseUrl }))
      expect(errors.some((error: string) => error.includes('TLS') || error.includes('tls=true'))).toBe(true)
    })
  })

  describe('CRON_SECRET', () => {
    it('é obrigatória em produção', () => {
      const { errors } = validateProductionEnv(envWithout('CRON_SECRET'))
      expect(errors).toContain('CRON_SECRET é obrigatória em produção')
    })

    it('rejeita segredo com menos de 32 caracteres', () => {
      const { errors } = validateProductionEnv(envWith({ CRON_SECRET: 'x'.repeat(31) }))
      expect(errors).toContain('CRON_SECRET deve ter pelo menos 32 caracteres')
    })

    it('aceita segredo com 32 caracteres', () => {
      const { errors } = validateProductionEnv(envWith({ CRON_SECRET: 'this-is-a-valid-fake-cron-secret' }))
      expect(errors).toEqual([])
    })
  })

  describe('object storage', () => {
    const completeStorage: Partial<NodeJS.ProcessEnv> = {
      STORAGE_ENDPOINT: 'https://storage.example.invalid',
      STORAGE_BUCKET: 'biblion-assets',
      STORAGE_ACCESS_KEY_ID: 'storage-access-key', // gitleaks:allow
      STORAGE_SECRET_ACCESS_KEY: 'storage-secret-key', // gitleaks:allow
      STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.invalid/biblion',
    }

    it('permite deixar o storage totalmente desabilitado', () => {
      const { errors } = validateProductionEnv(validProductionEnv)
      expect(errors).toEqual([])
    })

    it('aceita o grupo completo com URLs HTTPS', () => {
      const { errors } = validateProductionEnv(envWith(completeStorage))
      expect(errors).toEqual([])
    })

    it.each([
      { STORAGE_ENDPOINT: 'https://storage.example.invalid' },
      { STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.invalid' },
      { ...completeStorage, STORAGE_SECRET_ACCESS_KEY: '' },
    ])('rejeita configuração parcial: %o', (storage) => {
      const { errors } = validateProductionEnv(envWith(storage))
      expect(errors.some((error: string) => error.includes('STORAGE_') && error.includes('juntas'))).toBe(true)
    })

    it('rejeita endpoint sem HTTPS', () => {
      const { errors } = validateProductionEnv(
        envWith({ ...completeStorage, STORAGE_ENDPOINT: 'http://storage.example.invalid' }),
      )
      expect(errors).toContain('STORAGE_ENDPOINT deve usar https:')
    })

    it('rejeita URL pública sem HTTPS', () => {
      const { errors } = validateProductionEnv(
        envWith({ ...completeStorage, STORAGE_PUBLIC_BASE_URL: 'http://cdn.example.invalid' }),
      )
      expect(errors).toContain('STORAGE_PUBLIC_BASE_URL deve usar https:')
    })

    it('não inclui credenciais do storage nos erros', () => {
      const secret = 'valor-secreto-que-nao-pode-vazar'
      const { errors } = validateProductionEnv(
        envWith({
          ...completeStorage,
          STORAGE_ENDPOINT: 'http://storage.example.invalid',
          STORAGE_SECRET_ACCESS_KEY: secret,
        }),
      )
      expect(errors.join('\n')).not.toContain(secret)
    })
  })
})
