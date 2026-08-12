'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** Percentual 0-100. Ignorado quando `indeterminate` é true. */
  value?: number
  /** Barra animada sem valor fixo (ex.: aguardando rate limit). */
  indeterminate?: boolean
  /** Altura da trilha. */
  size?: 'sm' | 'md'
  /** Mostra o rótulo de percentual à direita da trilha. */
  showValue?: boolean
  className?: string
}

const sizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
} as const

/**
 * Barra de progresso reutilizável. Em modo determinado, preenche até `value`.
 * Em modo indeterminado, exibe um bloco animado deslizante — usado quando o
 * pipeline está parado aguardando a janela de rate limit da IA.
 */
export function ProgressBar({
  value = 0,
  indeterminate = false,
  size = 'md',
  showValue = false,
  className,
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn('relative flex-1 overflow-hidden rounded-full bg-elevated', sizes[size])}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da análise"
      >
        {indeterminate ? (
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-primary/70"
            initial={{ x: '-120%' }}
            animate={reduceMotion ? { x: '0%' } : { x: ['-120%', '320%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            initial={false}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          />
        )}
      </div>
      {showValue && !indeterminate && (
        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {clamped}%
        </span>
      )}
    </div>
  )
}
