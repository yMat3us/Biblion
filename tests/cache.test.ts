import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheDel, cached } from '@/lib/redis'

/** Mock do Upstash REST: responde a cada comando conforme `responder`. */
function mockRedis(responder: (command: unknown[]) => unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const command = JSON.parse(init.body) as unknown[]
    return { ok: true, json: async () => ({ result: responder(command) }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('cache read-through — sem Redis (passthrough)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  })

  it('executa o loader e NÃO toca no Redis', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const loader = vi.fn().mockResolvedValue(42)

    await expect(cached('k', 60, loader)).resolves.toBe(42)
    expect(loader).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('cache read-through — com Redis', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok')
  })

  it('miss: executa o loader e grava com SET ... EX', async () => {
    const commands: unknown[][] = []
    mockRedis((command) => {
      commands.push(command)
      return command[0] === 'GET' ? null : 'OK'
    })
    const loader = vi.fn().mockResolvedValue({ v: 1 })

    const result = await cached('k', 60, loader)

    expect(result).toEqual({ v: 1 })
    expect(loader).toHaveBeenCalledOnce()
    expect(commands[0]).toEqual(['GET', 'k'])
    expect(commands.find((c) => c[0] === 'SET')).toEqual(['SET', 'k', JSON.stringify({ v: 1 }), 'EX', 60])
  })

  it('hit: devolve o valor cacheado e NÃO chama o loader', async () => {
    mockRedis((command) => (command[0] === 'GET' ? JSON.stringify({ v: 9 }) : 'OK'))
    const loader = vi.fn()

    await expect(cached('k', 60, loader)).resolves.toEqual({ v: 9 })
    expect(loader).not.toHaveBeenCalled()
  })

  it('cacheDel envia o comando DEL', async () => {
    const commands: unknown[][] = []
    mockRedis((command) => {
      commands.push(command)
      return 1
    })

    await cacheDel('k')

    expect(commands[0]).toEqual(['DEL', 'k'])
  })
})
