import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { buttonStyles } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export type WorkspaceArchetype =
  | 'folio'
  | 'reader'
  | 'atlas'
  | 'manuscript'
  | 'library'
  | 'marginalia'
  | 'cabinet'
  | 'administration'

export function WorkspacePage({
  children,
  className,
  size = 'wide',
  archetype,
}: {
  children: ReactNode
  className?: string
  size?: 'compact' | 'wide' | 'full'
  archetype?: WorkspaceArchetype
}) {
  return (
    <div
      data-archetype={archetype}
      className={cn(
        'workspace-page page-container animate-fade-in',
        size === 'compact' && 'max-w-5xl',
        size === 'wide' && 'max-w-7xl',
        size === 'full' && 'max-w-[91rem]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type DetailHeaderVariant = 'manuscript' | 'reader' | 'atlas' | 'administration' | 'quiet'

export function DetailHeader({
  backHref,
  backLabel = 'Voltar',
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
  actions,
  className,
  variant = 'manuscript',
  index,
}: {
  backHref?: string
  backLabel?: string
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  variant?: DetailHeaderVariant
  index?: ReactNode
}) {
  return (
    <header className={cn('detail-header', `detail-header--${variant}`, className)}>
      <div className="relative min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className={buttonStyles({ variant: 'ghost', size: 'sm', className: '-ml-2 mb-5 w-fit' })}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          {Icon && (
            <span className="icon-tile mt-0.5 h-11 w-11 rounded-2xl sm:h-12 sm:w-12">
              <Icon size={21} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {index && <div className="detail-header__index">{index}</div>}
            {eyebrow && <div className="eyebrow mb-2 flex flex-wrap items-center gap-2 text-primary-hover">{eyebrow}</div>}
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl lg:text-[2.5rem] lg:leading-[1.06]">
              {title}
            </h1>
            {description && <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">{description}</p>}
            {meta && <div className="mt-5 flex flex-wrap items-center gap-2.5">{meta}</div>}
          </div>
        </div>
      </div>
      {actions && <div className="relative flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </header>
  )
}

export function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
  className,
  index,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  index?: ReactNode
}) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft text-primary">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          {index && <p className="index-label mb-1.5">{index}</p>}
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          <span aria-hidden="true" className="section-heading__rule" />
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function EditorActionBar({
  children,
  status,
  className,
}: {
  children: ReactNode
  status?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('editor-action-bar', className)}>
      {status && <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">{status}</div>}
      <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">{children}</div>
    </div>
  )
}
