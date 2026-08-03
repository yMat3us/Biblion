import 'server-only'

import { logger } from '@/lib/logger'

/**
 * Acesso ao Redis (Upstash REST) compartilhado pelo bus de tempo real. Lê as
 * credenciais em tempo de chamada (não no import) para respeitar o ambiente do
 * runtime. Ausência de config não é erro: os chamadores degradam para o caminho
 * em memória / polling.
 */
export function redisRest(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

export function redisConfigured(): boolean {
  return redisRest() !== null
}

/** PUBLISH via REST (comando único no corpo). Best-effort: nunca lança. */
export async function redisPublish(channel: string, message: string): Promise<boolean> {
  const rest = redisRest()
  if (!rest) return false
  try {
    const response = await fetch(rest.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rest.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['PUBLISH', channel, message]),
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    return response.ok
  } catch (error) {
    logger.warn('redis_publish_failed', { error })
    return false
  }
}

// ---------------------------------------------------------------------------
// Cache read-through (config-gated). Sem Redis, `cached` apenas executa o loader
// (sem cache); com Redis, guarda o valor JSON com TTL. Best-effort: qualquer
// erro/timeout do Redis degrada para o loader — nunca derruba a requisição.
// ---------------------------------------------------------------------------

/** Executa um comando único no Redis via REST. Devolve null em ausência de config/erro. */
async function redisCommand<T = unknown>(command: Array<string | number>): Promise<{ result: T } | null> {
  const rest = redisRest()
  if (!rest) return null
  try {
    const response = await fetch(rest.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rest.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) return null
    return (await response.json()) as { result: T }
  } catch (error) {
    logger.warn('redis_command_failed', { error })
    return null
  }
}

/** Lê e desserializa um valor do cache. null = miss (ou Redis indisponível). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const response = await redisCommand<string | null>(['GET', key])
  if (!response || response.result == null) return null
  try {
    return JSON.parse(response.result) as T
  } catch {
    return null
  }
}

/** Grava um valor no cache com expiração (segundos). Best-effort. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redisCommand(['SET', key, JSON.stringify(value), 'EX', Math.max(1, Math.trunc(ttlSeconds))])
}

/** Remove uma chave do cache (invalidação). Best-effort. */
export async function cacheDel(key: string): Promise<void> {
  await redisCommand(['DEL', key])
}

/**
 * Read-through: devolve o valor do cache (hit) ou executa o loader, cacheia o
 * resultado e o devolve. Sem Redis configurado, é um passthrough para o loader.
 * Não cacheia null/undefined (não persiste "misses"). Erros do loader propagam
 * (nunca são cacheados).
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const enabled = redisConfigured()
  if (enabled) {
    const hit = await cacheGet<T>(key)
    if (hit !== null) return hit
  }
  const value = await loader()
  if (enabled && value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds)
  }
  return value
}
