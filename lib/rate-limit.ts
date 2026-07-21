import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()
let redisWarningEmitted = false

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
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
      console.warn('[RATE_LIMIT] Redis indisponível; usando fallback local por processo.', error)
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
  authAccount: { limit: 8, windowMs: 15 * 60_000 },
} as const
