'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { BrainCircuit, PenTool, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea, type TextareaProps } from '@/components/ui/Textarea'

interface IntelligentTextareaProps extends TextareaProps {
  onAiAction?: (action: string, selectedText: string) => void
}

const AI_ACTIONS = [
  { id: 'explicar', label: 'Explicar trecho', icon: BrainCircuit },
  { id: 'melhorar', label: 'Melhorar escrita', icon: PenTool },
  { id: 'aplicacao', label: 'Gerar aplicação', icon: Sparkles },
] as const

export const IntelligentTextarea = forwardRef<HTMLTextAreaElement, IntelligentTextareaProps>(function IntelligentTextarea(
  {
    onAiAction,
    containerClassName,
    className,
    onSelect,
    onKeyUp,
    ...props
  },
  forwardedRef,
) {
  const [selection, setSelection] = useState({ text: '', show: false })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement)

  const updateSelection = () => {
    const element = textareaRef.current
    if (!element || !onAiAction) return
    const text = element.value.substring(element.selectionStart, element.selectionEnd).trim()
    setSelection({ text, show: text.length > 0 })
  }

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setSelection((current) => ({ ...current, show: false }))
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelection((current) => ({ ...current, show: false }))
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const runAction = (action: string) => {
    if (!selection.text || !onAiAction) return
    onAiAction(action, selection.text)
    setSelection((current) => ({ ...current, show: false }))
    textareaRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', containerClassName)}>
      <Textarea
        ref={textareaRef}
        className={className}
        onSelect={(event) => {
          updateSelection()
          onSelect?.(event)
        }}
        onKeyUp={(event) => {
          updateSelection()
          onKeyUp?.(event)
        }}
        {...props}
      />

      {selection.show && onAiAction && (
        <div
          role="menu"
          aria-label="Ações de inteligência artificial para o texto selecionado"
          className="absolute left-2 right-2 top-9 z-30 animate-fade-in rounded-xl border border-primary/20 bg-overlay/95 p-1.5 shadow-overlay backdrop-blur-xl sm:left-auto sm:right-2 sm:w-52"
        >
          <div className="mb-1 flex items-center gap-2 border-b border-hairline px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-hover">
            <Sparkles size={12} aria-hidden="true" /> Assistente de escrita
          </div>
          {AI_ACTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:bg-primary-soft"
              onClick={() => runAction(id)}
            >
              <Icon size={13} className="text-primary" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
