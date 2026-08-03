import { describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { assertInternalSecret } from '@/lib/internal-auth'

const SECRET = 'fake-32-char-cron-secret-for-test!'

function reqWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest
}

describe('assertInternalSecret — autorização de jobs internos por segredo', () => {
  it('recusa (503) quando CRON_SECRET não está configurado', () => {
    vi.stubEnv('CRON_SECRET', '')
    expect(() => assertInternalSecret(reqWith({ authorization: `Bearer ${SECRET}` }))).toThrowError(
      expect.objectContaining({ status: 503 }),
    )
  })

  it('recusa (503) quando o segredo é fraco demais (<16 chars)', () => {
    vi.stubEnv('CRON_SECRET', 'curto')
    expect(() => assertInternalSecret(reqWith({ authorization: 'Bearer curto' }))).toThrowError(
      expect.objectContaining({ status: 503 }),
    )
  })

  it('recusa (401) quando nenhum segredo é enviado', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    expect(() => assertInternalSecret(reqWith({}))).toThrowError(expect.objectContaining({ status: 401 }))
  })

  it('recusa (401) quando o segredo enviado está errado', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    expect(() => assertInternalSecret(reqWith({ authorization: 'Bearer valor-errado-porem-longo-1234' }))).toThrowError(
      expect.objectContaining({ status: 401 }),
    )
  })

  it('aceita o segredo correto via Authorization: Bearer', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    expect(() => assertInternalSecret(reqWith({ authorization: `Bearer ${SECRET}` }))).not.toThrow()
  })

  it('aceita o segredo correto via header x-cron-secret', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    expect(() => assertInternalSecret(reqWith({ 'x-cron-secret': SECRET }))).not.toThrow()
  })
})
