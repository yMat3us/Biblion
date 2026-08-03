'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(firstFocusable ?? dialogRef.current)?.focus()
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="modal-layer fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/72 backdrop-blur-md"
        onMouseDown={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Janela de diálogo'}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'animate-modal-in top-sheen relative flex max-h-[min(90dvh,52rem)] w-full flex-col overflow-hidden',
          'rounded-t-[1.6rem] border border-hairline-strong bg-overlay shadow-overlay sm:rounded-[1.6rem]',
          sizes[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar diálogo"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-subtle transition-colors hover:border-hairline hover:bg-elevated hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="custom-scrollbar overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
