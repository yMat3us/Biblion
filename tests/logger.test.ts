import { describe, expect, it, vi } from 'vitest'
import { logger, __redactForTest as redact } from '@/lib/logger'

type AnyRecord = Record<string, unknown>

describe('logger — redação de segredos e PII', () => {
  it('redige chaves sensíveis e preserva chaves inócuas (authorId não é segredo)', () => {
    const out = redact({
      password: 'x',
      tokenHash: 'y',
      authorization: 'Bearer z',
      apiKey: 'k',
      cookie: 'biblion_session=abc',
      nested: { secret: 's', ok: 1 },
      authorId: 'keep-me',
    }) as AnyRecord
    const nested = out.nested as AnyRecord

    expect(out.password).toBe('[REDACTED]')
    expect(out.tokenHash).toBe('[REDACTED]')
    expect(out.authorization).toBe('[REDACTED]')
    expect(out.apiKey).toBe('[REDACTED]')
    expect(out.cookie).toBe('[REDACTED]')
    expect(nested.secret).toBe('[REDACTED]')
    expect(nested.ok).toBe(1)
    expect(out.authorId).toBe('keep-me')
  })

  it('reduz Error a campos seguros e mascara segredos embutidos na mensagem', () => {
    const err = Object.assign(new Error('falha token=abcdef123456 bearer XYZ987654321abc'), { code: 'P2002' })
    const out = redact({ error: err }) as { error: AnyRecord }

    expect(out.error.name).toBe('Error')
    expect(out.error.code).toBe('P2002')
    expect(String(out.error.message)).toContain('token=[REDACTED]')
    expect(String(out.error.message)).toContain('bearer [REDACTED]')
    expect(String(out.error.message)).not.toContain('abcdef123456')
  })

  it('logger.error emite UMA linha JSON estruturada e redigida', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      logger.error('unit_event', { token: 'fake-token-value', keep: 'ok' })
      expect(spy).toHaveBeenCalledTimes(1)
      const line = spy.mock.calls[0][0] as string
      expect(line).not.toContain('fake-token-value')
      expect(JSON.parse(line)).toMatchObject({ level: 'error', event: 'unit_event', keep: 'ok', token: '[REDACTED]' })
    } finally {
      spy.mockRestore()
    }
  })
})
