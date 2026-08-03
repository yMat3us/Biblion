import { describe, expect, it } from 'vitest'
import { RateLimits, clearFailures, failureCount, loginBackoffSeconds, registerFailure } from '@/lib/rate-limit'

// Regressão de segurança: as escritas sociais e o envio de mensagens têm limites
// dedicados e mais apertados que o padrão (120/min). Este teste impede que alguém
// os afrouxe silenciosamente de volta para o padrão.
describe('RateLimits — limites dedicados', () => {
  it('social e message são mais restritos que o padrão', () => {
    expect(RateLimits.social.limit).toBeLessThan(RateLimits.standard.limit)
    expect(RateLimits.message.limit).toBeLessThan(RateLimits.standard.limit)
  })

  it('social e message usam escopos próprios (buckets isolados)', () => {
    expect(RateLimits.social.scope).toBe('social')
    expect(RateLimits.message.scope).toBe('message')
    expect(RateLimits.social.scope).not.toBe(RateLimits.message.scope)
  })

  it('todos os presets têm limite e janela positivos', () => {
    for (const preset of Object.values(RateLimits)) {
      expect(preset.limit).toBeGreaterThan(0)
      expect(preset.windowMs).toBeGreaterThan(0)
    }
  })
})

describe('contadores de falha (anti-brute-force, fallback em memória)', () => {
  it('incrementa por chave e é zerado no clear', async () => {
    const key = `test-fail-${Math.random()}`
    expect(await failureCount(key)).toBe(0)
    expect(await registerFailure(key, 60_000)).toBe(1)
    expect(await registerFailure(key, 60_000)).toBe(2)
    expect(await failureCount(key)).toBe(2)
    await clearFailures(key)
    expect(await failureCount(key)).toBe(0)
  })

  it('backoff é monotônico, começa em 30s e satura em 900s', () => {
    expect(loginBackoffSeconds(-3)).toBe(30)
    expect(loginBackoffSeconds(0)).toBe(30)
    expect(loginBackoffSeconds(1)).toBe(60)
    expect(loginBackoffSeconds(2)).toBe(120)
    expect(loginBackoffSeconds(100)).toBe(900)
  })
})
