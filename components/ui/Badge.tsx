import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'border-primary/25 bg-primary-soft text-primary-hover',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-scripture/20 bg-scripture-soft text-scripture',
    danger: 'border-destructive/20 bg-destructive/10 text-destructive',
    info: 'border-info/20 bg-info/10 text-info',
    outline: 'border-hairline-strong bg-background/35 text-muted-foreground',
  }

  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold leading-none tracking-[-0.005em]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
