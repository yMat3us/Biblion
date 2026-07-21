'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { BookOpen, Check, ChevronDown, Loader2, RotateCcw, X } from 'lucide-react'
import { LIVROS_BIBLIA } from '@/data/livros'
import { buttonStyles } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface VerseSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  id?: string
}

interface BibleVerse {
  verse: number
  text: string
}

interface BibleReferenceSelection {
  book: string
  chapter: string
  verses: string[]
}

interface PreviewResult {
  requestKey: string
  verses: BibleVerse[]
}

function expandVerseExpression(expression: string): string[] {
  const numbers = new Set<number>()
  expression.split(',').forEach((part) => {
    const normalized = part.trim()
    const range = normalized.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      if (start > 0 && end >= start && end - start <= 200) {
        for (let number = start; number <= end; number += 1) numbers.add(number)
      }
      return
    }
    if (/^\d+$/.test(normalized) && Number(normalized) > 0) numbers.add(Number(normalized))
  })
  return [...numbers].sort((a, b) => a - b).map(String)
}

function compactVerses(verses: string[]): string {
  const numbers = [...new Set(verses.map(Number).filter(Number.isInteger))].sort((a, b) => a - b)
  const parts: string[] = []
  let index = 0
  while (index < numbers.length) {
    const start = numbers[index]
    let end = start
    while (index + 1 < numbers.length && numbers[index + 1] === end + 1) {
      index += 1
      end = numbers[index]
    }
    parts.push(start === end ? String(start) : `${start}-${end}`)
    index += 1
  }
  return parts.join(', ')
}

function parseBibleReference(value: string): BibleReferenceSelection {
  const trimmed = value.trim()
  if (!trimmed) return { book: '', chapter: '', verses: [] }

  const complete = trimmed.match(/^(.+?)\s+(\d+)(?::(.+))?$/)
  if (!complete) return { book: trimmed, chapter: '', verses: [] }

  return {
    book: complete[1].trim(),
    chapter: complete[2],
    verses: complete[3] ? expandVerseExpression(complete[3]) : [],
  }
}

export function VerseSelector({ value, onChange, label, placeholder, error, hint, id }: VerseSelectorProps) {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const dialogId = `${triggerId}-dialog`
  const messageId = `${triggerId}-message`
  const [isOpen, setIsOpen] = useState(false)
  const [selection, setSelection] = useState<BibleReferenceSelection>(() => parseBibleReference(value))
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([])
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [chapterError, setChapterError] = useState('')
  const [previewResult, setPreviewResult] = useState<PreviewResult>({ requestKey: '', verses: [] })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bookSelectRef = useRef<HTMLSelectElement>(null)

  const { book, chapter, verses } = selection
  const bookIndex = LIVROS_BIBLIA.findIndex((candidate) => candidate.nome === book)
  const parsedPreview = parseBibleReference(value)
  const previewBookIndex = LIVROS_BIBLIA.findIndex((candidate) => candidate.nome === parsedPreview.book)
  const previewChapter = parsedPreview.chapter
  const previewNumbers = parsedPreview.verses.join(',')
  const previewRequestKey = previewBookIndex >= 0 && previewChapter && previewNumbers
    ? `${previewBookIndex}/${previewChapter}/${previewNumbers}`
    : ''
  const preview = previewResult.requestKey === previewRequestKey ? previewResult.verses : []
  const loadingPreview = Boolean(!isOpen && previewRequestKey && previewResult.requestKey !== previewRequestKey)

  useEffect(() => {
    if (!isOpen) return

    const trigger = triggerRef.current
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()

    const scrollRoot = trigger?.closest<HTMLElement>('.shell-main') ?? document.body
    const previousOverflow = scrollRoot.style.overflow
    const previousOverscrollBehavior = scrollRoot.style.overscrollBehavior
    scrollRoot.style.overflow = 'hidden'
    scrollRoot.style.overscrollBehavior = 'contain'
    const frame = requestAnimationFrame(() => bookSelectRef.current?.focus())

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      scrollRoot.style.overflow = previousOverflow
      scrollRoot.style.overscrollBehavior = previousOverscrollBehavior
      document.removeEventListener('keydown', handleDialogKeyDown)
      if (dialog.open) dialog.close()
      if (trigger?.isConnected) requestAnimationFrame(() => trigger.focus())
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || bookIndex < 0 || !chapter) return

    const controller = new AbortController()
    fetch(`/api/bible/NVI/${bookIndex}/${chapter}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('request-failed')))
      .then((data: unknown) => setChapterVerses(Array.isArray(data) ? data as BibleVerse[] : []))
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setChapterError('Não foi possível carregar os versículos deste capítulo.')
          setChapterVerses([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingChapter(false)
      })
    return () => controller.abort()
  }, [bookIndex, chapter, isOpen])

  useEffect(() => {
    if (!previewRequestKey || isOpen) return

    const controller = new AbortController()
    const selected = new Set(previewNumbers.split(',').map(Number))
    fetch(`/api/bible/NVI/${previewBookIndex}/${previewChapter}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('request-failed')))
      .then((data: unknown) => {
        setPreviewResult({
          requestKey: previewRequestKey,
          verses: Array.isArray(data) ? (data as BibleVerse[]).filter((verse) => selected.has(verse.verse)) : [],
        })
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setPreviewResult({ requestKey: previewRequestKey, verses: [] })
        }
      })
    return () => controller.abort()
  }, [isOpen, previewBookIndex, previewChapter, previewNumbers, previewRequestKey])

  const toggleDialog = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const parsed = parseBibleReference(value)
    setSelection(parsed)
    setChapterVerses([])
    setChapterError('')
    setLoadingChapter(Boolean(parsed.book && parsed.chapter))
    setIsOpen(true)
  }

  const applySelection = () => {
    if (!book) return
    const reference = chapter
      ? `${book} ${chapter}${verses.length > 0 ? `:${compactVerses(verses)}` : ''}`
      : book
    onChange(reference)
    setIsOpen(false)
  }

  const clearSelection = () => {
    setSelection({ book: '', chapter: '', verses: [] })
    setChapterVerses([])
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5">
      {label && <label htmlFor={triggerId} className="ml-0.5 text-sm font-medium text-muted-foreground">{label}</label>}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        aria-describedby={error || hint ? messageId : undefined}
        onClick={toggleDialog}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-hairline-strong bg-elevated/75 px-3.5 py-2 text-left text-sm shadow-inner transition-[border-color,background-color,box-shadow]',
          'hover:border-hairline-strong hover:bg-elevated focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20',
          error && 'border-destructive/60',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <BookOpen size={16} className="shrink-0 text-scripture" aria-hidden="true" />
          <span className={cn('truncate', value ? 'font-medium text-foreground' : 'text-subtle')}>
            {value || placeholder || 'Selecionar texto bíblico…'}
          </span>
        </span>
        <ChevronDown size={15} className={cn('shrink-0 text-subtle transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      {(error || hint) && (
        <p id={messageId} className={cn('ml-0.5 text-xs leading-relaxed', error ? 'text-destructive' : 'text-subtle')}>
          {error || hint}
        </p>
      )}

      {!isOpen && loadingPreview && (
        <div role="status" className="mt-1 flex items-center gap-2 text-xs text-subtle">
          <Loader2 size={13} className="animate-spin text-scripture" aria-hidden="true" /> Carregando prévia bíblica…
        </div>
      )}
      {!isOpen && preview.length > 0 && (
        <div className="reader-paper mt-1 p-4">
          <div className="relative space-y-2">
            {preview.map((verse) => (
              <p key={verse.verse} className="font-serif text-sm leading-7 text-muted-foreground">
                <span className="verse-number">{verse.verse}</span>{verse.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <dialog
          ref={dialogRef}
          id={dialogId}
          aria-label="Selecionar texto bíblico"
          className="verse-selector-dialog"
          onCancel={(event) => { event.preventDefault(); setIsOpen(false) }}
          onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <div className="verse-selector-dialog__panel" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <p className="eyebrow text-primary-hover">Referência bíblica</p>
                <p className="mt-1 text-sm text-muted-foreground">Escolha livro, capítulo e versículos.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className={buttonStyles({ variant: 'ghost', size: 'icon', className: '-mr-1 -mt-1 h-9 w-9' })} aria-label="Fechar">
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="field-label mb-1.5 block">1. Livro</span>
                <select
                  ref={bookSelectRef}
                  value={book}
                  onChange={(event) => {
                    setSelection({ book: event.target.value, chapter: '', verses: [] })
                    setChapterVerses([])
                    setChapterError('')
                    setLoadingChapter(false)
                  }}
                  className="select-field"
                >
                  <option value="">Escolha um livro…</option>
                  {LIVROS_BIBLIA.map((candidate) => <option key={candidate.nome} value={candidate.nome}>{candidate.nome}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="field-label mb-1.5 block">2. Capítulo</span>
                <select
                  value={chapter}
                  disabled={!book}
                  onChange={(event) => {
                    const nextChapter = event.target.value
                    setSelection((current) => ({ ...current, chapter: nextChapter, verses: [] }))
                    setChapterVerses([])
                    setChapterError('')
                    setLoadingChapter(Boolean(nextChapter))
                  }}
                  className="select-field disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <option value="">Escolha um capítulo…</option>
                  {Array.from({ length: LIVROS_BIBLIA.find((candidate) => candidate.nome === book)?.capitulos ?? 0 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>Capítulo {index + 1}</option>
                  ))}
                </select>
              </label>
            </div>

            {chapter && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="field-label">3. Versículos <span className="font-normal text-subtle">(opcional)</span></span>
                  {verses.length > 0 && <span className="rounded-full border border-scripture/20 bg-scripture-soft px-2 py-0.5 text-[10px] font-semibold text-scripture">{verses.length} selecionado{verses.length === 1 ? '' : 's'}</span>}
                </div>
                <div className="min-h-28 max-h-52 overflow-y-auto rounded-xl border border-hairline bg-background/45 p-3 custom-scrollbar">
                  {loadingChapter ? (
                    <div role="status" className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={17} className="animate-spin text-primary" aria-hidden="true" /> Carregando capítulo…
                    </div>
                  ) : chapterError ? (
                    <p role="alert" className="flex min-h-24 items-center justify-center px-4 text-center text-sm text-destructive">{chapterError}</p>
                  ) : chapterVerses.length > 0 ? (
                    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                      {chapterVerses.map((verse) => {
                        const number = String(verse.verse)
                        const selected = verses.includes(number)
                        return (
                          <button
                            key={number}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`Versículo ${number}`}
                            onClick={() => setSelection((current) => ({
                              ...current,
                              verses: selected
                                ? current.verses.filter((item) => item !== number)
                                : [...current.verses, number].sort((a, b) => Number(a) - Number(b)),
                            }))}
                            className={cn(
                              'flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
                              selected
                                ? 'border-scripture/45 bg-scripture text-background shadow-soft'
                                : 'border-transparent bg-elevated text-muted-foreground hover:border-hairline-strong hover:text-foreground',
                            )}
                          >
                            {selected ? <Check size={13} aria-hidden="true" /> : number}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="flex min-h-24 items-center justify-center text-sm text-subtle">Nenhum versículo encontrado.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row sm:justify-between">
              <button type="button" onClick={clearSelection} className={buttonStyles({ variant: 'ghost', size: 'md' })}>
                <RotateCcw size={15} aria-hidden="true" /> Limpar
              </button>
              <button type="button" disabled={!book} onClick={applySelection} className={buttonStyles({ size: 'md' })}>
                <Check size={16} aria-hidden="true" /> Usar referência
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
