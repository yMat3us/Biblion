import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok, ApiErrors } from '@/lib/http'
import { parseJson, aiVerseSchema } from '@/lib/validation'
import { generateVerseAnalysis, runReviewPass } from '@/lib/ai-verse-analysis'
import type { AnalysisProgress, VerseAnalysisResult } from '@/lib/ai-audit-types'
import { RateLimits } from '@/lib/rate-limit'
import { db } from '@/lib/firebase'
import { sendAnalysisPush } from '@/lib/push'
import { decideAnalysisMode, extractStoredDraft, isStaleGenerating } from '@/lib/verse-analysis-cache'

export const maxDuration = 300

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { verseRef, verseText } = await parseJson(req, aiVerseSchema)

    const docId = verseRef
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')

    const docRef = db.collection('verseAnalysis').doc(docId)

    // CACHE + DEDUPLICAÇÃO ATÔMICA (numa única transação, sem janela de corrida).
    // Decide o modo de forma atômica a partir do estado atual do doc:
    // - APPROVED (válido)        → CACHE HIT: devolve do banco, nenhuma IA;
    // - GENERATING (vivo)        → IN-FLIGHT: devolve o doc em andamento (dedup);
    // - NEEDS_REVIEW + draft OK   → REVIEW-RETRY: reivindica e roda SÓ a revisão
    //                               sobre o draft existente (NÃO regera — economia);
    // - inexistente/ERROR/stale/  → GENERATE: reivindica e roda a geração completa.
    //   NEEDS_REVIEW sem draft
    // Um get()+set() separado deixava uma janela entre leitura e escrita em que
    // dois pedidos simultâneos disparavam dois trabalhos. A transação a fecha.
    const claim = await db.runTransaction<
      | { mode: 'cache' | 'inflight' | 'review-retry'; data: Record<string, unknown> }
      | { mode: 'generate'; data: null }
    >(async (tx) => {
      const snap = await tx.get(docRef)
      const data = snap.data() as Record<string, unknown> | undefined
      const mode = decideAnalysisMode(data, snap.exists)

      if (mode === 'cache' || mode === 'inflight') {
        return { mode, data: data as Record<string, unknown> }
      }

      if (mode === 'review-retry') {
        // Reivindica o doc para RETRY da revisão, preservando o conteúdo do draft
        // (merge) e sinalizando a fase de revisão para o polling/dedup.
        tx.set(
          docRef,
          {
            auditStatus: 'GENERATING',
            verseRef,
            userId: user.id,
            startedAt: new Date().toISOString(),
            progressUpdatedAt: new Date().toISOString(),
            progress: 90,
            phase: 'reviewing',
            statusMessage: 'Revisando e auditando a análise…',
            waitingRateLimit: false,
          },
          { merge: true },
        )
        return { mode, data: data as Record<string, unknown> }
      }

      // Inexistente / ERROR / stale / NEEDS_REVIEW sem draft → geração completa.
      tx.set(docRef, {
        auditStatus: 'GENERATING',
        verseRef,
        userId: user.id,
        startedAt: new Date().toISOString(),
        progress: 0,
        phase: 'starting',
        statusMessage: 'Iniciando análise teológica avançada…',
      })
      return { mode: 'generate', data: null }
    })

    if (claim.mode === 'cache' || claim.mode === 'inflight') {
      console.log(`[AI_ANALYSIS] ${claim.mode === 'cache' ? 'cache hit' : 'in-flight (dedup)'} — ${docId}`)
      // Inclui o docId para que o cliente possa retomar o polling/rastreamento
      // ao reabrir um versículo cuja análise ainda está em geração.
      return ok({ ...claim.data, docId })
    }

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

    // Fila de escritas SERIALIZADA. As escritas de progresso são disparadas sem
    // await (fire-and-forget); sem serialização, uma escrita de progresso atrasada
    // podia chegar ao Firestore DEPOIS da escrita final e reverter o doc para
    // GENERATING (bug: análise concluída mas travada em 88%). Encadeando todas as
    // escritas, e aguardando a fila antes da escrita final, garantimos que o
    // resultado final seja sempre a ÚLTIMA gravação aplicada.
    let writeChain: Promise<unknown> = Promise.resolve()
    const queueWrite = (data: Record<string, unknown>, merge: boolean): Promise<unknown> => {
      writeChain = writeChain
        .then(() => (merge ? docRef.set(data, { merge: true }) : docRef.set(data)))
        .catch((error: unknown) => {
          console.error('[Pipeline] Failed to persist doc:', error)
        })
      return writeChain
    }

    // Persiste cada atualização de progresso (merge) para o polling do cliente.
    const onProgress = (p: AnalysisProgress) => {
      queueWrite(
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
        true,
      )
      maybePush(p)
    }

    // REVIEW-RETRY reusa o draft e roda só a 2ª etapa; caso contrário, geração
    // completa. Ambos retornam um VerseAnalysisResult e compartilham a mesma
    // escrita final serializada abaixo.
    let pipeline: Promise<VerseAnalysisResult>
    if (claim.mode === 'review-retry') {
      console.log(`[AI_ANALYSIS] review retry (reaproveitando draft, sem regerar) — ${docId}`)
      pipeline = runReviewPass(extractStoredDraft(claim.data, verseRef, verseText), onProgress)
    } else {
      pipeline = generateVerseAnalysis(verseRef, verseText, onProgress)
    }

    pipeline
      .then(async (analysis) => {
        // O pipeline já define auditStatus (APPROVED ou NEEDS_REVIEW).
        const statusMessage =
          analysis.auditStatus === 'APPROVED'
            ? 'Análise concluída e aprovada'
            : 'Análise concluída (requer revisão)'
        // Drena todas as escritas de progresso pendentes e então grava o resultado
        // final por ÚLTIMO (substituindo o doc), para nenhuma escrita atrasada
        // reverter o status concluído.
        await writeChain
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
        await writeChain
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
