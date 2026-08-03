import type { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
// Contadores de FALHA de login (anti-brute-force). Diferente de `buckets`, só
// incrementam em falha e são zerados no sucesso.
const failures = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()
let redisWarningEmitted = false

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  for (const [key, bucket] of failures) {
    if (bucket.resetAt <= now) failures.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  cleanup(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count += 1
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 }
}

async function hashKey(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Buffer.from(digest).toString('hex')
}

async function redisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const redisKey = `biblion:rate-limit:${await hashKey(key)}`
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PEXPIRE', redisKey, windowMs, 'NX'],
        ['PTTL', redisKey],
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) throw new Error(`Redis HTTP ${response.status}`)

    const result = await response.json() as Array<{ result?: number | string; error?: string }>
    if (result.some((entry) => entry.error)) throw new Error('Redis pipeline failure')
    const count = Number(result[0]?.result)
    const ttl = Math.max(0, Number(result[2]?.result) || windowMs)
    if (!Number.isFinite(count)) throw new Error('Invalid Redis counter')

    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: count <= limit ? 0 : Math.ceil(ttl / 1000),
    }
  } catch (error) {
    if (!redisWarningEmitted) {
      redisWarningEmitted = true
      logger.warn('rate_limit_redis_unavailable', { error })
    }
    return null
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  return (await redisRateLimit(key, limit, windowMs)) ?? memoryRateLimit(key, limit, windowMs)
}

/** Only trust forwarding headers when the deployment explicitly declares a trusted proxy. */
export function clientKey(req: NextRequest): string {
  if (process.env.TRUST_PROXY !== 'true') return 'direct-client'
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'trusted-proxy-unknown'
}

export const RateLimits = {
  standard: { limit: 120, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000, scope: 'ai' },
  aiUpload: { limit: 10, windowMs: 60_000, scope: 'ai' },
  auth: { limit: 8, windowMs: 60_000, scope: 'auth' },
  // Escritas sociais (solicitar/responder/remover amizade, bloquear, iniciar
  // conversa): frequência legítima baixa; teto apertado para conter spam.
  social: { limit: 20, windowMs: 60_000, scope: 'social' },
  // Envio de mensagens: conversas têm rajadas curtas, mas floods são abuso.
  message: { limit: 30, windowMs: 60_000, scope: 'message' },
} as const

// ---------------------------------------------------------------------------
// Anti-brute-force: contadores de FALHA de login (por IP e por conta).
// Incrementam apenas em falha e são zerados no sucesso — uma credencial correta
// nunca fica bloqueada, e o estado é redefinido no login bem-sucedido.
// ---------------------------------------------------------------------------
function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function redisPipeline(commands: Array<Array<string | number>>): Promise<Array<{ result?: unknown; error?: string }> | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) throw new Error(`Redis HTTP ${response.status}`)
    const result = (await response.json()) as Array<{ result?: unknown; error?: string }>
    if (result.some((entry) => entry.error)) throw new Error('Redis pipeline failure')
    return result
  } catch (error) {
    if (!redisWarningEmitted) {
      redisWarningEmitted = true
      logger.warn('rate_limit_redis_unavailable', { error })
    }
    return null
  }
}

async function failureRedisKey(key: string): Promise<string> {
  return `biblion:login-fail:${await hashKey(key)}`
}

/** Registra uma falha e devolve a contagem atual na janela. Redis com fallback em memória. */
export async function registerFailure(key: string, windowMs: number): Promise<number> {
  if (redisConfigured()) {
    const redisKey = await failureRedisKey(key)
    const result = await redisPipeline([['INCR', redisKey], ['PEXPIRE', redisKey, windowMs, 'NX']])
    const count = result ? Number(result[0]?.result) : NaN
    if (Number.isFinite(count)) return count
  }
  const now = Date.now()
  cleanup(now)
  const bucket = failures.get(key)
  if (!bucket || bucket.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + windowMs })
    return 1
  }
  bucket.count += 1
  return bucket.count
}

/** Lê a contagem de falhas atual (0 se não houver ou já expirou). */
export async function failureCount(key: string): Promise<number> {
  if (redisConfigured()) {
    const result = await redisPipeline([['GET', await failureRedisKey(key)]])
    if (result) {
      const count = Number(result[0]?.result ?? 0)
      return Number.isFinite(count) ? count : 0
    }
  }
  const bucket = failures.get(key)
  return bucket && bucket.resetAt > Date.now() ? bucket.count : 0
}

/** Zera as falhas (chamado no login bem-sucedido). */
export async function clearFailures(key: string): Promise<void> {
  if (redisConfigured()) {
    const result = await redisPipeline([['DEL', await failureRedisKey(key)]])
    if (result) return
  }
  failures.delete(key)
}

/** Backoff progressivo (segundos) a partir de quantas falhas passaram do limite. */
export function loginBackoffSeconds(over: number): number {
  const steps = Math.max(0, over)
  return Math.min(30 * 2 ** Math.min(steps, 5), 900)
}
