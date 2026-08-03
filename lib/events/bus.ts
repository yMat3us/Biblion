import 'server-only'

import { EventEmitter } from 'node:events'
import { logger } from '@/lib/logger'
import { redisConfigured, redisPublish, redisRest } from '@/lib/redis'

// Bus de tempo real para o fan-out de eventos aos streams SSE conectados.
//
// Dois backends, um caminho por vez (sem entrega dupla):
//  - Redis configurado: PUBLISH/SUBSCRIBE do Upstash → fan-out ENTRE instâncias.
//  - Sem Redis: EventEmitter do processo → funciona em deploy de instância única.
//
// Muitos SSE simultâneos assinam o mesmo emitter (um por usuário conectado), daí
// o limite de listeners removido.
const emitter = new EventEmitter()
emitter.setMaxListeners(0)

/**
 * Publica um payload em um canal (ex.: `user:<id>`). Best-effort: nunca lança —
 * uma falha de fan-out jamais deve afetar quem emitiu o evento de domínio.
 */
export async function publish(channel: string, payload: unknown): Promise<void> {
  try {
    if (redisConfigured()) {
      await redisPublish(channel, JSON.stringify(payload))
      return
    }
    emitter.emit(channel, payload)
  } catch (error) {
    logger.warn('bus_publish_failed', { error })
  }
}

/**
 * Assina um canal e chama `onMessage` a cada evento, até o `signal` abortar
 * (desconexão do client). Com Redis, abre a stream SSE `/subscribe` do Upstash;
 * sem Redis, escuta o EventEmitter local.
 */
export function subscribe(channel: string, onMessage: (payload: unknown) => void, signal: AbortSignal): void {
  if (redisConfigured()) {
    void subscribeViaRedis(channel, onMessage, signal)
    return
  }
  const listener = (payload: unknown) => onMessage(payload)
  emitter.on(channel, listener)
  signal.addEventListener('abort', () => emitter.off(channel, listener), { once: true })
}

/**
 * Extrai o payload de um frame do Upstash `/subscribe`: `message,<canal>,<payload>`.
 * O payload é o JSON que publicamos e PODE conter vírgulas, então cortamos apenas
 * nas duas primeiras. Confirmações (`subscribe`/`unsubscribe`) são ignoradas.
 */
export function parseRedisMessage(data: string): unknown {
  const firstComma = data.indexOf(',')
  if (firstComma === -1) return undefined
  const secondComma = data.indexOf(',', firstComma + 1)
  if (secondComma === -1) return undefined
  if (data.slice(0, firstComma) !== 'message') return undefined
  try {
    return JSON.parse(data.slice(secondComma + 1))
  } catch {
    return undefined
  }
}

async function subscribeViaRedis(
  channel: string,
  onMessage: (payload: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  const rest = redisRest()
  if (!rest) return
  try {
    const response = await fetch(`${rest.url}/subscribe/${encodeURIComponent(channel)}`, {
      headers: { Authorization: `Bearer ${rest.token}` },
      cache: 'no-store',
      signal,
    })
    if (!response.ok || !response.body) {
      logger.warn('redis_subscribe_failed', { status: response.status })
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = parseRedisMessage(line.slice(5).trim())
        if (payload !== undefined) onMessage(payload)
      }
    }
  } catch (error) {
    // Aborto pela desconexão do client é esperado; só registramos falhas reais.
    if (!signal.aborted) logger.warn('redis_subscribe_error', { error })
  }
}

export const bus = { publish, subscribe }
