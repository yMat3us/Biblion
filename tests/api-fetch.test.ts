import { describe, expect, it, vi } from 'vitest'
import { ApiFetchError, apiFetch } from '@/lib/api-fetch'

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  } as unknown as Response
}

/** fetch que só rejeita quando o AbortController da tentativa dispara. */
function hangingFetch() {
  return vi.fn((_url: string, init: { signal: AbortSignal }) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason ?? new Error('aborted')))
    }),
  )
}

describe('apiFetch', () => {
  it('devolve o JSON no sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { ok: 1 })))
    await expect(apiFetch('/x')).resolves.toEqual({ ok: 1 })
  })

  it('repete GET em 5xx e sucede na 2ª tentativa', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: { code: 'X', message: 'y' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/x', { retryDelayMs: 0 })).resolves.toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('repete GET em erro de rede', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/x', { retryDelayMs: 0 })).resolves.toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('NÃO repete POST (não idempotente) em 5xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, { error: { code: 'X', message: 'y' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/x', { method: 'POST', retryDelayMs: 0 })).rejects.toBeInstanceOf(ApiFetchError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('4xx lança ApiFetchError com code/message do envelope, sem repetir', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'não achei' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/x', { retryDelayMs: 0 })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'não achei',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('respeita o teto de tentativas e então lança', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: { code: 'X', message: 'y' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/x', { retries: 2, retryDelayMs: 0 })).rejects.toBeInstanceOf(ApiFetchError)
    expect(fetchMock).toHaveBeenCalledTimes(3) // 1 inicial + 2 retentativas
  })

  it('aborta por timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    await expect(apiFetch('/x', { timeoutMs: 10, retries: 0 })).rejects.toBeTruthy()
  })

  it('abort externo não é repetido', async () => {
    const controller = new AbortController()
    const fetchMock = hangingFetch()
    vi.stubGlobal('fetch', fetchMock)

    const promise = apiFetch('/x', { signal: controller.signal, retryDelayMs: 0 })
    controller.abort(new Error('cancelado'))

    await expect(promise).rejects.toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
