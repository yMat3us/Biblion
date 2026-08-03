import { beforeEach, describe, expect, it, vi } from 'vitest'

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger }))

import { estimateCostUsd, logAiUsage, measure, normalizeUsage } from '@/lib/observability'

describe('normalizeUsage', () => {
  it('lê a convenção do AI SDK v5 (input/output/total)', () => {
    expect(normalizeUsage({ inputTokens: 100, outputTokens: 50, totalTokens: 150 })).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    })
  })

  it('cai para a convenção v4 (prompt/completion) e calcula o total ausente', () => {
    expect(normalizeUsage({ promptTokens: 100, completionTokens: 50 })).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    })
  })

  it('trata usage ausente como zeros', () => {
    expect(normalizeUsage(undefined)).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
  })
})

describe('estimateCostUsd', () => {
  it('estima o custo com base no preço do modelo', () => {
    // gpt-4o: 2.5 (entrada) + 10 (saída) por 1M de tokens.
    expect(
      estimateCostUsd('gpt-4o', { inputTokens: 1_000_000, outputTokens: 1_000_000, totalTokens: 2_000_000 }),
    ).toBe(12.5)
  })

  it('modelo desconhecido -> custo 0', () => {
    expect(estimateCostUsd('modelo-desconhecido', { inputTokens: 1000, outputTokens: 1000, totalTokens: 2000 })).toBe(0)
  })
})

describe('logAiUsage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('registra ai_usage com tokens, custo e duração', () => {
    logAiUsage({
      operation: 'chat',
      provider: 'openai',
      model: 'gpt-4o',
      usage: { inputTokens: 1_000_000, outputTokens: 0, totalTokens: 1_000_000 },
      durationMs: 42,
    })
    expect(logger.info).toHaveBeenCalledWith(
      'ai_usage',
      expect.objectContaining({
        operation: 'chat',
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 1_000_000,
        outputTokens: 0,
        totalTokens: 1_000_000,
        estimatedCostUsd: 2.5,
        durationMs: 42,
      }),
    )
  })
})

describe('measure', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mede sucesso e registra durationMs + ok true', async () => {
    await expect(measure('op', async () => 7)).resolves.toBe(7)
    expect(logger.info).toHaveBeenCalledWith('op', expect.objectContaining({ ok: true, durationMs: expect.any(Number) }))
  })

  it('repropaga o erro e registra ok false', async () => {
    await expect(
      measure('op', async () => {
        throw new Error('falhou')
      }),
    ).rejects.toThrow('falhou')
    expect(logger.warn).toHaveBeenCalledWith('op', expect.objectContaining({ ok: false }))
  })
})
