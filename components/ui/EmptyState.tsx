import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('empty-state', compact && 'empty-state--compact', className)}>
      <div aria-hidden="true" className="empty-state__halo" />
      <span className="empty-state__icon">
        <Icon size={compact ? 22 : 28} aria-hidden="true" />
      </span>
      {eyebrow && <div className="eyebrow mt-5 text-primary-hover">{eyebrow}</div>}
      <h2 className={cn('relative mt-3 font-semibold tracking-tight text-foreground', compact ? 'text-lg' : 'text-xl sm:text-2xl')}>
        {title}
      </h2>
      {description && <p className="relative mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">{description}</p>}
      {action && <div className="relative mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}
