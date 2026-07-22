import { cn } from '@/lib/utils'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  trailing?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, trailing, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const messageId = `${inputId}-message`
    const describedBy = [ariaDescribedBy, error || hint ? messageId : undefined].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="ml-0.5 text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="group relative">
          {icon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-primary"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'flex h-12 w-full rounded-[0.82rem] border border-hairline-strong bg-background/48 px-3.5 text-base text-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.32)] xl:h-11 xl:text-sm',
              'placeholder:text-subtle transition-[border-color,background-color,box-shadow] duration-200',
              'hover:border-hairline-strong hover:bg-elevated/58 focus-visible:border-primary/55 focus-visible:bg-elevated/78',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/16',
              'disabled:cursor-not-allowed disabled:opacity-45',
              icon && 'pl-10',
              trailing && 'pr-12',
              error && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20',
              className,
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 items-center">
              {trailing}
            </span>
          )}
        </div>
        {(error || hint) && (
          <p id={messageId} className={cn('ml-0.5 text-xs leading-relaxed', error ? 'text-destructive' : 'text-muted-foreground')}>
            {error || hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
export { Input }
