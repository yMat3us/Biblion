import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok, ApiErrors } from '@/lib/http'
import { parseJson, aiVerseSchema } from '@/lib/validation'
import { generateVerseAnalysis } from '@/lib/ai-verse-analysis'
import type { AnalysisProgress } from '@/lib/ai-audit-types'
import { RateLimits } from '@/lib/rate-limit'
import { db } from '@/lib/firebase'
import { sendAnalysisPush } from '@/lib/push'

export const maxDuration = 300

// Uma análise em GENERATING que não recebe atualização de progresso há mais de
// STALE_GENERATING_MS foi, quase certamente, interrompida — o servidor reiniciou
// e matou o pipeline em memória. O limite é folgado de propósito: uma única
// chamada de IA lenta (auditoria com muitos retries, backoff de rate limit) pode
// deixar minutos entre gravações de progresso num pipeline VIVO. Um valor apertado
// causava falso positivo (a análise seguia rodando, mas era marcada como
// interrompida). Só um processo realmente morto fica sem gravar por 5 min.
const STALE_GENERATING_MS = 300_000

function isStaleGenerating(data: Record<string, unknown> | undefined): boolean {
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

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { verseRef, verseText } = await parseJson(req, aiVerseSchema)

    const docId = verseRef
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')

    const docRef = db.collection('verseAnalysis').doc(docId)
    const docSnap = await docRef.get()
    const existing = docSnap.data()

    // Reutiliza o doc só se estiver concluído ou realmente em andamento. Docs
    // travados em GENERATING por uma interrupção (restart) caem no fluxo de
    // (re)geração abaixo.
    if (docSnap.exists && existing?.auditStatus !== 'ERROR' && !isStaleGenerating(existing)) {
      // Inclui o docId para que o cliente possa retomar o polling/rastreamento
      // ao reabrir um versículo cuja análise ainda está em geração.
      return ok({ ...existing, docId })
    }

    await docRef.set({
      auditStatus: 'GENERATING',
      verseRef,
      userId: user.id,
      startedAt: new Date().toISOString(),
      progress: 0,
      phase: 'starting',
      statusMessage: 'Iniciando análise teológica avançada…',
    })

    // Envia push nativo (barra de notificações do celular) a cada MARCO — troca
    // de módulo ou de estado de rate limit — para não gerar spam. As demais
    // atualizações finas ficam só na barra em tela (polling).
    let lastPushSig = ''
    const maybePush = (p: AnalysisProgress) => {
      const sig = `${p.currentModule ?? '-'}|${p.waitingRateLimit ? 'rl' : 'ok'}|${p.phase}`
      if (sig === lastPushSig) return
      lastPushSig = sig
      void sendAnalysisPush(user.id, {
        docId,
        verseRef,
        progress: p.progress,
        statusMessage: p.statusMessage,
        waitingRateLimit: p.waitingRateLimit,
        state: 'progress',
      })
    }

    // Persiste cada atualização de progresso no doc (merge) para o polling do
    // cliente. Best-effort: uma falha de escrita nunca deve interromper o pipeline.
    const onProgress = (p: AnalysisProgress) => {
      void docRef
        .set(
          {
            auditStatus: 'GENERATING',
            verseRef,
            progress: p.progress,
            phase: p.phase,
            statusMessage: p.statusMessage,
            currentModule: p.currentModule ?? null,
            totalModules: p.totalModules ?? null,
            waitingRateLimit: p.waitingRateLimit ?? false,
            rateLimitSeconds: p.rateLimitSeconds ?? null,
            progressUpdatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
        .catch((error: unknown) => {
          console.error('[Pipeline] Failed to persist progress:', error)
        })
      maybePush(p)
    }

    generateVerseAnalysis(verseRef, verseText, onProgress)
      .then(async (analysis) => {
        // O pipeline já define auditStatus (APPROVED ou NEEDS_REVIEW).
        // Grava o resultado final já com progresso 100% para o cliente encerrar.
        const statusMessage =
          analysis.auditStatus === 'APPROVED'
            ? 'Análise concluída e aprovada'
            : 'Análise concluída (requer revisão)'
        await docRef.set({
          ...analysis,
          userId: user.id,
          progress: 100,
          phase: 'done',
          statusMessage,
          waitingRateLimit: false,
          progressUpdatedAt: new Date().toISOString(),
        })
        void sendAnalysisPush(user.id, {
          docId,
          verseRef,
          progress: 100,
          statusMessage,
          state: 'done',
        })
      })
      .catch(async (error: unknown) => {
        console.error('[Pipeline] Error generating verse analysis:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        await docRef.set({
          auditStatus: 'ERROR',
          error: errorMessage,
          verseRef,
          userId: user.id,
          phase: 'error',
          statusMessage: 'Erro ao gerar a análise',
          waitingRateLimit: false,
          progressUpdatedAt: new Date().toISOString(),
        })
        void sendAnalysisPush(user.id, {
          docId,
          verseRef,
          progress: 0,
          statusMessage: 'Erro ao gerar a análise',
          state: 'error',
        })
      })

    return ok({ auditStatus: 'GENERATING', docId })
  },
  { rateLimit: RateLimits.ai },
)

export const GET = route(
  async (req: NextRequest) => {
    const docId = req.nextUrl.searchParams.get('docId')
    if (!docId) {
      throw ApiErrors.badRequest('O parâmetro docId é obrigatório')
    }

    const docRef = db.collection('verseAnalysis').doc(docId)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      throw ApiErrors.notFound('Análise não encontrada')
    }

    const data = docSnap.data()

    // Geração interrompida (servidor reiniciou): reporta como erro TRANSITÓRIO
    // para o cliente parar de acompanhar um progresso zumbi. NÃO grava nada: se o
    // pipeline ainda estiver vivo e voltar a gravar progresso, a próxima leitura
    // já não é mais obsoleta (evita "envenenar" o doc com um estado de erro
    // permanente). Um novo POST detecta a obsolescência por conta própria e
    // reinicia a análise.
    if (isStaleGenerating(data)) {
      return ok({
        ...data,
        auditStatus: 'ERROR',
        interrupted: true,
        phase: 'error',
        statusMessage: 'Geração interrompida (o servidor reiniciou).',
        error: 'Geração interrompida',
      })
    }

    return ok(data)
  },
  // Leitura de status por polling: limite generoso e escopo próprio (não é a
  // geração de IA, que é cara e usa RateLimits.ai no POST).
  { rateLimit: RateLimits.aiStatus },
)
