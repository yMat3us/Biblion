import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseRedisMessage, publish, subscribe } from '@/lib/events/bus'

describe('bus — pub/sub em processo (sem Redis)', () => {
  beforeEach(() => {
    // Força o caminho em memória, independente do ambiente ambiente local.
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  })

  it('entrega o payload publicado aos assinantes do mesmo canal', async () => {
    const controller = new AbortController()
    const recebidos: unknown[] = []
    subscribe('user:1', (payload) => recebidos.push(payload), controller.signal)

    await publish('user:1', { type: 'friend.requested' })

    expect(recebidos).toEqual([{ type: 'friend.requested' }])
    controller.abort()
  })

  it('não entrega a assinantes de outro canal', async () => {
    const controller = new AbortController()
    const recebidos: unknown[] = []
    subscribe('user:1', (payload) => recebidos.push(payload), controller.signal)

    await publish('user:2', { type: 'message.sent' })

    expect(recebidos).toEqual([])
    controller.abort()
  })

  it('para de entregar após o abort (desinscreve o listener)', async () => {
    const controller = new AbortController()
    const recebidos: unknown[] = []
    subscribe('user:1', (payload) => recebidos.push(payload), controller.signal)

    controller.abort()
    await publish('user:1', { type: 'friend.accepted' })

    expect(recebidos).toEqual([])
  })
})

describe('parseRedisMessage — frame do Upstash /subscribe', () => {
  it('extrai o payload JSON de um frame "message"', () => {
    expect(parseRedisMessage('message,user:1,{"type":"friend.requested"}')).toEqual({ type: 'friend.requested' })
  })

  it('preserva vírgulas dentro do payload JSON', () => {
    expect(parseRedisMessage('message,user:1,{"type":"message.sent","conversationId":"c1"}')).toEqual({
      type: 'message.sent',
      conversationId: 'c1',
    })
  })

  it('ignora confirmações de subscribe/unsubscribe', () => {
    expect(parseRedisMessage('subscribe,user:1,1')).toBeUndefined()
  })

  it('ignora frames malformados ou sem payload', () => {
    expect(parseRedisMessage('lixo')).toBeUndefined()
    expect(parseRedisMessage('message,user:1,{invalido')).toBeUndefined()
  })
})
