'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Feedback'
import type { AnalysisPhase, VerseAnalysisResult } from '@/lib/ai-audit-types'

// Rastreamento em segundo plano das análises de versículo em geração. Vive na
// árvore do dashboard, então continua fazendo polling mesmo quando o usuário
// navega para outra página. Publica atualizações de status via notificações do
// navegador (funciona no WebView Android / PWA quando a permissão é concedida)
// e via toasts na conclusão.

const POLL_MS = 5000
const STORAGE_KEY = 'biblion:analysis-tracking:v1'
/** Após concluir/errar, mantém o card visível por este tempo antes de sumir sozinho. */
const KEEP_FINISHED_MS = 1000 * 60 * 10

export type TrackedStatus = 'generating' | 'done' | 'error'

export interface TrackedAnalysis {
  docId: string
  /** Referência legível, ex.: "João 3:16". */
  verseRef: string
  /** Rota para reabrir a análise (ex.: /biblia/João?cap=3&v=16). */
  href: string
  status: TrackedStatus
  progress: number
  phase: AnalysisPhase
  statusMessage: string
  waitingRateLimit: boolean
  currentModule?: number | null
  totalModules?: number | null
  result?: VerseAnalysisResult
  error?: string
  startedAt: number
  updatedAt: number
}

interface TrackInput {
  docId: string
  verseRef: string
  href: string
}

interface AnalysisProgressContextValue {
  analyses: TrackedAnalysis[]
  track: (input: TrackInput) => void
  get: (docId: string) => TrackedAnalysis | undefined
  dismiss: (docId: string) => void
}

const AnalysisProgressContext = createContext<AnalysisProgressContextValue | null>(null)

interface PersistedEntry {
  docId: string
  verseRef: string
  href: string
  startedAt: number
}

function loadPersisted(): PersistedEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PersistedEntry[]
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - KEEP_FINISHED_MS
    return parsed.filter((entry) => entry?.docId && entry.startedAt > cutoff - 1000 * 60 * 60)
  } catch {
    return []
  }
}

function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    // Chamado a partir de um gesto do usuário (clique em "analisar"), então o
    // prompt é permitido. Ignoramos a promise: é best-effort.
    void Notification.requestPermission().catch(() => undefined)
  }
}

function showNotification(tag: string, title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag, // mesma tag substitui a notificação anterior (status ao vivo)
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      silent: true,
    })
  } catch {
    // Alguns ambientes exigem ServiceWorkerRegistration.showNotification; ignoramos.
  }
}

export function AnalysisProgressProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const [analyses, setAnalyses] = useState<Record<string, TrackedAnalysis>>({})

  // Espelho em ref para o loop de polling ler sem recriar o intervalo.
  const analysesRef = useRef(analyses)
  useEffect(() => {
    analysesRef.current = analyses
  }, [analyses])

  // Assinatura da última notificação enviada por docId (evita spam: só
  // notificamos quando o módulo muda, entra/sai de rate limit, ou finaliza).
  const notifSigRef = useRef<Record<string, string>>({})

  // Persistência: sobrevive a reloads (ex.: WebView reinicia a página).
  const persist = useCallback((map: Record<string, TrackedAnalysis>) => {
    if (typeof window === 'undefined') return
    try {
      const entries: PersistedEntry[] = Object.values(map).map((a) => ({
        docId: a.docId,
        verseRef: a.verseRef,
        href: a.href,
        startedAt: a.startedAt,
      }))
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // Cota cheia / modo privado: ignora.
    }
  }, [])

  const track = useCallback(
    (input: TrackInput) => {
      requestNotificationPermission()
      setAnalyses((current) => {
        const existing = current[input.docId]
        const next: TrackedAnalysis = existing
          ? { ...existing, verseRef: input.verseRef, href: input.href, status: 'generating' }
          : {
              docId: input.docId,
              verseRef: input.verseRef,
              href: input.href,
              status: 'generating',
              progress: 0,
              phase: 'starting',
              statusMessage: 'Iniciando análise…',
              waitingRateLimit: false,
              startedAt: Date.now(),
              updatedAt: Date.now(),
            }
        const map = { ...current, [input.docId]: next }
        persist(map)
        return map
      })
    },
    [persist],
  )

  const dismiss = useCallback(
    (docId: string) => {
      setAnalyses((current) => {
        if (!current[docId]) return current
        const rest = { ...current }
        delete rest[docId]
        persist(rest)
        return rest
      })
    },
    [persist],
  )

  const get = useCallback((docId: string) => analysesRef.current[docId], [])

  // Rehidrata rastreamentos salvos ao montar. O update é adiado (fora do corpo
  // síncrono do efeito) para não disparar renders em cascata nem divergir da
  // marcação renderizada no servidor (o localStorage só existe no cliente).
  useEffect(() => {
    const persisted = loadPersisted()
    if (persisted.length === 0) return
    const id = setTimeout(() => {
      setAnalyses((current) => {
        const map = { ...current }
        for (const entry of persisted) {
          if (map[entry.docId]) continue
          map[entry.docId] = {
            ...entry,
            status: 'generating',
            progress: 0,
            phase: 'starting',
            statusMessage: 'Retomando acompanhamento…',
            waitingRateLimit: false,
            updatedAt: Date.now(),
          }
        }
        return map
      })
    }, 0)
    return () => clearTimeout(id)
  }, [])

  // Loop de polling: consulta cada análise em geração e atualiza o estado.
  useEffect(() => {
    let inFlight = false

    const poll = async () => {
      if (inFlight) return
      const active = Object.values(analysesRef.current).filter((a) => a.status === 'generating')
      if (active.length === 0) return
      inFlight = true
      try {
        const results = await Promise.all(
          active.map(async (a) => {
            try {
              const res = await fetch(`/api/ai/verse-analysis?docId=${encodeURIComponent(a.docId)}`)
              // 404: o doc sumiu (ex.: entrada obsoleta reidratada). Encerra o
              // acompanhamento. Outros erros (429/5xx) são transitórios: mantém.
              if (res.status === 404) return { docId: a.docId, gone: true as const }
              if (!res.ok) return null
              return { docId: a.docId, data: (await res.json()) as Record<string, unknown> }
            } catch {
              return null
            }
          }),
        )

        // Calcula as atualizações usando o snapshot atual (ref) como estado
        // anterior. Estado e efeitos colaterais são aplicados FORA do updater
        // (o updater deve ser puro; toasts/notificações não podem rodar nele).
        const updates = new Map<string, TrackedAnalysis>()
        // Entradas a remover silenciosamente: doc sumiu (404) ou geração
        // interrompida por restart do servidor. Não faz sentido mostrar/avisar —
        // apenas some (nada de "progresso zumbi" que nunca conclui).
        const toRemove = new Set<string>()
        for (const r of results) {
          if (!r) continue
          const prev = analysesRef.current[r.docId]
          if (!prev) continue
          if ('gone' in r) {
            toRemove.add(r.docId)
            continue
          }
          const data = r.data
          if (data.interrupted === true) {
            toRemove.add(r.docId)
            continue
          }
          const auditStatus = data.auditStatus as string | undefined

          let status: TrackedStatus = 'generating'
          if (auditStatus === 'APPROVED' || auditStatus === 'NEEDS_REVIEW') status = 'done'
          else if (auditStatus === 'ERROR') status = 'error'

          updates.set(r.docId, {
            ...prev,
            status,
            progress: typeof data.progress === 'number' ? data.progress : prev.progress,
            phase: (data.phase as AnalysisPhase) ?? prev.phase,
            statusMessage: (data.statusMessage as string) ?? prev.statusMessage,
            waitingRateLimit: Boolean(data.waitingRateLimit),
            currentModule: (data.currentModule as number | null | undefined) ?? prev.currentModule,
            totalModules: (data.totalModules as number | null | undefined) ?? prev.totalModules,
            result: status === 'done' ? (data as unknown as VerseAnalysisResult) : prev.result,
            error: status === 'error' ? ((data.error as string) ?? 'Erro desconhecido') : prev.error,
            updatedAt: Date.now(),
          })
        }

        if (updates.size === 0 && toRemove.size === 0) return

        setAnalyses((current) => {
          const map = { ...current }
          for (const [docId, next] of updates) {
            if (map[docId]) map[docId] = next
          }
          for (const docId of toRemove) {
            delete map[docId]
            delete notifSigRef.current[docId]
          }
          persist(map)
          return map
        })

        // Efeitos colaterais (toasts + notificações) após atualizar o estado.
        for (const [docId, next] of updates) {
          const prev = analysesRef.current[docId]
          if (prev) handleSideEffects(prev, next)
        }
      } finally {
        inFlight = false
      }
    }

    const handleSideEffects = (prev: TrackedAnalysis, next: TrackedAnalysis) => {
      const sig =
        next.status === 'done'
          ? 'done'
          : next.status === 'error'
            ? 'error'
            : `${next.currentModule ?? '-'}|${next.waitingRateLimit ? 'rl' : 'ok'}`
      if (notifSigRef.current[next.docId] === sig) return
      const first = notifSigRef.current[next.docId] === undefined
      notifSigRef.current[next.docId] = sig

      if (next.status === 'done') {
        toast.success(`Análise de ${next.verseRef} concluída`)
        showNotification(`analysis-${next.docId}`, 'Análise concluída', `${next.verseRef} está pronta para leitura.`)
        return
      }
      if (next.status === 'error') {
        toast.error(`Erro na análise de ${next.verseRef}`)
        showNotification(`analysis-${next.docId}`, 'Falha na análise', `Não foi possível concluir ${next.verseRef}.`)
        return
      }
      // Em geração: não notifica na primeira observação (evita duplicar o toast
      // inicial), só nas transições de módulo / rate limit subsequentes.
      if (first) return
      const body = next.waitingRateLimit
        ? `${next.verseRef}: aguardando limite de requisições…`
        : `${next.verseRef}: ${next.statusMessage}`
      showNotification(`analysis-${next.docId}`, 'Análise em andamento', body)
    }

    const interval = setInterval(() => void poll(), POLL_MS)
    void poll()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist])

  // Remove cards finalizados antigos periodicamente.
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalyses((current) => {
        const cutoff = Date.now() - KEEP_FINISHED_MS
        let changed = false
        const map: Record<string, TrackedAnalysis> = {}
        for (const [docId, a] of Object.entries(current)) {
          if (a.status !== 'generating' && a.updatedAt < cutoff) {
            changed = true
            continue
          }
          map[docId] = a
        }
        if (changed) persist(map)
        return changed ? map : current
      })
    }, 60_000)
    return () => clearInterval(interval)
  }, [persist])

  return (
    <AnalysisProgressContext.Provider
      value={{ analyses: Object.values(analyses), track, get, dismiss }}
    >
      {children}
    </AnalysisProgressContext.Provider>
  )
}

export function useAnalysisProgress(): AnalysisProgressContextValue {
  const ctx = useContext(AnalysisProgressContext)
  if (!ctx) throw new Error('useAnalysisProgress deve ser usado dentro de <AnalysisProgressProvider>')
  return ctx
}
