import { cn } from '@/lib/utils'
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  containerClassName?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    containerClassName,
    label,
    error,
    hint,
    id,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const messageId = `${textareaId}-message`
    const describedBy = [ariaDescribedBy, error || hint ? messageId : undefined].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('flex min-w-0 flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="ml-0.5 text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'flex min-h-28 w-full resize-y rounded-xl border border-hairline-strong bg-elevated/75 px-3.5 py-3 text-base leading-relaxed text-foreground shadow-inner xl:min-h-24 xl:text-sm',
            'placeholder:text-subtle transition-[border-color,background-color,box-shadow] duration-200',
            'hover:border-hairline-strong hover:bg-elevated focus-visible:border-primary/60 focus-visible:bg-overlay/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-45',
            error && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20',
            className,
          )}
          {...props}
        />
        {(error || hint) && (
          <p
            id={messageId}
            className={cn('ml-0.5 text-xs leading-relaxed', error ? 'text-destructive' : 'text-subtle')}
            aria-live={error ? 'polite' : undefined}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
export { Textarea }
