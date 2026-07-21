import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PageHeaderVariant =
  | 'folio'
  | 'atlas'
  | 'manuscript'
  | 'library'
  | 'cabinet'
  | 'administration'
  | 'quiet'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  aside?: ReactNode
  variant?: PageHeaderVariant
  index?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  aside,
  variant = 'folio',
  index,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('page-header', `page-header--${variant}`, className)}>
      <span aria-hidden="true" className="page-header__mark" />
      {index && <div className="page-header__index">{index}</div>}

      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-4xl">
          {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
          <h1 className="page-header__title">{title}</h1>
          {description && <p className="page-header__description">{description}</p>}
          {aside && <div className="mt-5">{aside}</div>}
        </div>
        {action && <div className="page-header__action sm:self-start lg:self-end">{action}</div>}
      </div>
    </header>
  )
}
