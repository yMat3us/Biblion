import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'border border-primary/45 bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_16px_34px_-24px_var(--color-primary)] hover:-translate-y-px hover:border-primary-hover/70 hover:bg-primary-hover',
    secondary:
      'border border-hairline-strong bg-elevated text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] hover:border-primary/25 hover:bg-overlay',
    ghost: 'border border-transparent text-muted-foreground hover:border-hairline hover:bg-elevated/70 hover:text-foreground',
    danger:
      'border border-destructive/35 bg-destructive text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_12px_30px_-20px_rgb(241_111_122/0.75)] hover:-translate-y-px hover:brightness-110',
    outline:
      'border border-hairline-strong bg-background/36 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.025)] hover:border-primary/30 hover:bg-elevated/85',
  }

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 gap-1.5 rounded-[0.7rem] px-3.5 text-xs',
    md: 'h-11 gap-2 rounded-[0.8rem] px-4 text-sm',
    lg: 'h-12 gap-2.5 rounded-[0.85rem] px-5 text-sm',
    icon: 'h-10 w-10 rounded-[0.75rem]',
  }

  return cn(
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold tracking-[-0.01em]',
    'transition-[transform,background-color,border-color,color,box-shadow,filter] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-85" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" />
        </svg>
      )}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
export { Button }
