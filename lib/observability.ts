import { logger } from '@/lib/logger'

/**
 * Observabilidade de performance e custo, sobre o logger estruturado.
 *
 * - `startTimer`/`measure`: medem a duração de operações e a registram.
 * - `logAiUsage`: contabiliza tokens e estima o custo (USD) das chamadas de IA.
 *
 * Os preços são aproximados (por 1M de tokens) e servem para ordem de grandeza
 * e alertas de custo — não para faturamento. Ajuste conforme o provedor/modelo.
 */

/** Cronômetro monotônico: devolve uma função que retorna os ms decorridos. */
export function startTimer(): () => number {
  const start = performance.now()
  return () => Math.round(performance.now() - start)
}

/** Mede uma operação assíncrona e registra a duração (ok/erro), repropagando erros. */
export async function measure<T>(event: string, fn: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> {
  const done = startTimer()
  try {
    const result = await fn()
    logger.info(event, { ...meta, durationMs: done(), ok: true })
    return result
  } catch (error) {
    logger.warn(event, { ...meta, durationMs: done(), ok: false })
    throw error
  }
}

// Uso de tokens em qualquer convenção de nome (AI SDK v5: input/output; v4: prompt/completion).
export interface RawUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
}

export interface NormalizedUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export function normalizeUsage(usage?: RawUsage | null): NormalizedUsage {
  const inputTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0
  const outputTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens
  return { inputTokens, outputTokens, totalTokens }
}

// Preço aproximado por 1M de tokens (USD): { entrada, saída }.
interface ModelPrice {
  input: number
  output: number
}
const MODEL_PRICES: Record<string, ModelPrice> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export function estimateCostUsd(model: string, usage: NormalizedUsage): number {
  const price = MODEL_PRICES[model]
  if (!price) return 0
  const cost = (usage.inputTokens / 1_000_000) * price.input + (usage.outputTokens / 1_000_000) * price.output
  return Number(cost.toFixed(6))
}

/** Registra o uso/custo de uma chamada de IA. Best-effort (não deve quebrar o fluxo). */
export function logAiUsage(params: {
  operation: string
  provider: string
  model: string
  usage?: RawUsage | null
  durationMs?: number
}): void {
  const usage = normalizeUsage(params.usage)
  logger.info('ai_usage', {
    operation: params.operation,
    provider: params.provider,
    model: params.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: estimateCostUsd(params.model, usage),
    ...(params.durationMs !== undefined ? { durationMs: params.durationMs } : {}),
  })
}
