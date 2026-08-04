'use client'

import { useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import { LIVROS_BIBLIA } from '@/data/livros'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface BibleVerse {
  verse: number
  text: string
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

function parseBibleReference(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const complete = trimmed.match(/^(.+?)\s+(\d+)(?::(.+))?$/)
  if (!complete) return null

  const book = complete[1].trim()
  const chapter = complete[2]
  const verses = complete[3] ? expandVerseExpression(complete[3]) : []
  
  const bookIndex = LIVROS_BIBLIA.findIndex((candidate) => candidate.nome === book)
  if (bookIndex < 0) return null
  
  return { bookIndex, chapter, verses }
}

export function InteractiveVerse({ reference, className }: { reference: string, className?: string }) {
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [versesText, setVersesText] = useState<BibleVerse[]>([])
  const [error, setError] = useState('')
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const parsed = parseBibleReference(reference)
    if (!parsed) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/bible/NVI/${parsed.bookIndex}/${parsed.chapter}`)
      .then(res => {
        if (!res.ok) throw new Error('Falha ao buscar')
        return res.json()
      })
      .then((data: BibleVerse[]) => {
        const selectedSet = new Set(parsed.verses.map(Number))
        const filtered = parsed.verses.length > 0 
          ? data.filter(v => selectedSet.has(v.verse))
          : data
        setVersesText(filtered)
      })
      .catch(() => setError('Não foi possível carregar o versículo.'))
      .finally(() => setLoading(false))
  }, [reference])

  const handleToggle = () => {
    setExpanded(!expanded)
  }

  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <button 
        type="button" 
        onClick={handleToggle}
        className="group text-left"
      >
        <Badge variant={expanded ? "default" : "warning"} className="transition-colors hover:bg-scripture hover:text-white">
          {loading ? <Loader2 size={11} className="animate-spin mr-1.5" /> : <BookOpen size={11} className="mr-1.5" />}
          {reference}
        </Badge>
      </button>
      
      {expanded && versesText.length > 0 && (
        <div className="mt-3 relative rounded-xl border border-scripture/20 bg-scripture-soft/30 p-4 text-scripture shadow-sm">
          <div className="space-y-2">
            {versesText.map((verse) => (
              <p key={verse.verse} className="font-serif text-[15px] leading-relaxed">
                <sup className="mr-1 font-sans text-[10px] font-bold text-scripture/60">{verse.verse}</sup>
                {verse.text}
              </p>
            ))}
          </div>
        </div>
      )}
      
      {expanded && error && (
        <div className="mt-2 text-xs text-destructive">{error}</div>
      )}
    </div>
  )
}
