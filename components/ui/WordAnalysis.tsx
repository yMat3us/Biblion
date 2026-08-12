'use client'

import { WordAnalysisEntry } from '@/lib/ai-audit-types'
import { cn } from '@/lib/utils'

interface WordAnalysisProps {
  words: WordAnalysisEntry[]
  testament: 'AT' | 'NT'
}

export function WordAnalysis({ words, testament }: WordAnalysisProps) {
  return (
    <div className="flex flex-col space-y-8">
      {words.map((word, i) => (
        <div key={`${word.strongCode}-${i}`} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap text-lg md:text-xl">
            <span className="font-bold text-scripture">{word.strongCode}</span>
            <span className="text-muted-foreground">•</span>
            <span className={cn(
              "font-serif font-medium",
              testament === 'AT' ? "text-2xl" : "text-xl"
            )}>
              {word.originalWord}
            </span>
            <span className="text-muted-foreground italic text-base md:text-lg">
              ( {word.transliteration} )
            </span>
          </div>
          <div className="text-foreground/90 leading-relaxed space-y-2 mt-1">
            <p>{word.meaning}</p>
            {word.contextAnalysis && (
              <p className="text-muted-foreground">{word.contextAnalysis}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
