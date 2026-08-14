/**
 * Lógica PURA de cache/deduplicação/retry da análise de versículo.
 *
 * Extraída da rota (app/api/ai/verse-analysis/route.ts) para ser testável sem
 * depender de Firestore, autenticação ou rate limit. Não faz I/O.
 *
 * Decide, a partir do estado persistido do doc, o que fazer com uma nova
 * solicitação daquele versículo:
 *  - 'cache'        → já existe análise APROVADA válida: devolve do banco;
 *  - 'inflight'     → geração/revisão viva em andamento: dedup (não faz nada novo);
 *  - 'review-retry' → há um draft NEEDS_REVIEW reaproveitável: roda SÓ a revisão;
 *  - 'generate'     → inexistente/ERROR/obsoleto/sem draft: geração completa.
 */

import type { VerseAnalysisResult } from '@/lib/ai-audit-types'

// Uma análise em GENERATING que não recebe atualização de progresso há mais de
// STALE_GENERATING_MS foi, quase certamente, interrompida — o servidor reiniciou
// e matou o pipeline em memória. O limite é folgado de propósito: uma única
// chamada de IA lenta (auditoria com muitos retries, backoff de rate limit) pode
// deixar minutos entre gravações de progresso num pipeline VIVO. Um valor apertado
// causava falso positivo (a análise seguia rodando, mas era marcada como
// interrompida). Só um processo realmente morto fica sem gravar por 5 min.
export const STALE_GENERATING_MS = 300_000

export type AnalysisClaimMode = 'cache' | 'inflight' | 'review-retry' | 'generate'

export function isStaleGenerating(data: Record<string, unknown> | undefined): boolean {
  if (!data || data.auditStatus !== 'GENERATING') return false
  const ts =
    (typeof data.progressUpdatedAt === 'string' && data.progressUpdatedAt) ||
    (typeof data.startedAt === 'string' && data.startedAt) ||
    null
  if (!ts) return true
  const parsed = Date.parse(ts)
  if (!Number.isFinite(parsed)) return true
  return Date.now() - parsed > STALE_GENERATING_MS
}

/**
 * Um doc NEEDS_REVIEW só é reaproveitável para RETRY da revisão se contiver um
 * draft utilizável (a geração primária foi concluída). Sem isso, é preciso gerar.
 */
export function hasUsableDraft(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false
  const words = data.wordAnalysis
  const exegese = data.exegese
  return (
    Array.isArray(words) &&
    words.length > 0 &&
    typeof exegese === 'string' &&
    exegese.trim().length > 0
  )
}

/**
 * Decide o modo de atendimento para uma solicitação, a partir do estado do doc.
 * Pura: não escreve nada. A rota usa isto dentro de uma transação atômica.
 */
export function decideAnalysisMode(
  data: Record<string, unknown> | undefined,
  exists: boolean,
): AnalysisClaimMode {
  if (exists && data && !isStaleGenerating(data)) {
    if (data.auditStatus === 'APPROVED') return 'cache'
    if (data.auditStatus === 'GENERATING') return 'inflight'
    if (data.auditStatus === 'NEEDS_REVIEW' && hasUsableDraft(data)) return 'review-retry'
  }
  return 'generate'
}

/**
 * Reconstrói um VerseAnalysisResult (draft) a partir do doc persistido, para
 * reexecutar SOMENTE a etapa de revisão sem gastar uma nova geração.
 */
export function extractStoredDraft(
  data: Record<string, unknown>,
  fallbackRef: string,
  fallbackText: string,
): VerseAnalysisResult {
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
  return {
    reference: str(data.reference, fallbackRef),
    verseText: str(data.verseText, fallbackText),
    testament: data.testament === 'AT' ? 'AT' : 'NT',
    auditStatus: 'NEEDS_REVIEW',
    wordAnalysis: Array.isArray(data.wordAnalysis)
      ? (data.wordAnalysis as VerseAnalysisResult['wordAnalysis'])
      : [],
    exegese: str(data.exegese),
    hermeneutica: str(data.hermeneutica),
    contextoHistoricoCultural: str(data.contextoHistoricoCultural),
    contextoLiterario: str(data.contextoLiterario),
    teologia: str(data.teologia),
    referenciasCruzadas: Array.isArray(data.referenciasCruzadas)
      ? (data.referenciasCruzadas as VerseAnalysisResult['referenciasCruzadas'])
      : [],
  }
}
