'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, ScrollText, TriangleAlert, X } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAnalysisProgress, type TrackedAnalysis } from './AnalysisProgressProvider'
import { cn } from '@/lib/utils'

// Dock flutuante global: mostra as análises de versículo em andamento (e as
// recém-concluídas) com barra de progresso e status ao vivo, em qualquer página
// do dashboard. Roda em segundo plano — o usuário pode continuar navegando.

export function AnalysisProgressDock() {
  const { analyses, dismiss } = useAnalysisProgress()
  const [collapsed, setCollapsed] = useState(false)
  const reduceMotion = useReducedMotion()

  if (analyses.length === 0) return null

  const generating = analyses.filter((a) => a.status === 'generating').length
  const sorted = [...analyses].sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[130] mx-auto flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:mx-0 lg:bottom-6">
      <div className="glass pointer-events-auto overflow-hidden rounded-2xl shadow-overlay">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-elevated/60"
          aria-expanded={!collapsed}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            {generating > 0 ? <Loader2 size={16} className="animate-spin" /> : <ScrollText size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-foreground">
              {generating > 0 ? `Analisando ${generating} versículo${generating > 1 ? 's' : ''}` : 'Análises'}
            </span>
            <span className="block truncate text-[11px] text-subtle">
              {generating > 0 ? 'Processando em segundo plano…' : 'Concluídas nesta sessão'}
            </span>
          </span>
          {collapsed ? <ChevronUp size={16} className="text-subtle" /> : <ChevronDown size={16} className="text-subtle" />}
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ul className="max-h-[46vh] space-y-1.5 overflow-y-auto border-t border-hairline p-2 custom-scrollbar">
                {sorted.map((a) => (
                  <li key={a.docId}>
                    <AnalysisCard analysis={a} onDismiss={() => dismiss(a.docId)} />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function AnalysisCard({ analysis, onDismiss }: { analysis: TrackedAnalysis; onDismiss: () => void }) {
  const isDone = analysis.status === 'done'
  const isError = analysis.status === 'error'
  const isGenerating = analysis.status === 'generating'

  return (
    <div className="rounded-xl bg-surface/60 p-3">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
            isDone && 'bg-success/10 text-success',
            isError && 'bg-destructive/10 text-destructive',
            isGenerating && (analysis.waitingRateLimit ? 'bg-amber-500/10 text-amber-500' : 'bg-primary-soft text-primary'),
          )}
        >
          {isDone ? (
            <CheckCircle2 size={14} />
          ) : isError ? (
            <TriangleAlert size={14} />
          ) : analysis.waitingRateLimit ? (
            <Clock size={14} />
          ) : (
            <Loader2 size={14} className="animate-spin" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{analysis.verseRef}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {isError ? analysis.error || 'Erro ao gerar a análise' : analysis.statusMessage}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dispensar ${analysis.verseRef}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-foreground"
        >
          <X size={13} />
        </button>
      </div>

      {isGenerating && (
        <div className="mt-2.5">
          <ProgressBar
            value={analysis.progress}
            indeterminate={analysis.waitingRateLimit}
            size="sm"
            showValue={!analysis.waitingRateLimit}
          />
        </div>
      )}

      {isDone && (
        <Link
          href={analysis.href}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Ver análise
        </Link>
      )}
    </div>
  )
}
