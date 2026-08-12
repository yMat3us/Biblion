'use client'

import { VersionComparisonEntry } from '@/lib/ai-audit-types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface VersionComparisonProps {
  comparisons: VersionComparisonEntry[]
  testament: 'AT' | 'NT'
}

export function VersionComparison({ comparisons, testament }: VersionComparisonProps) {
  // Sort order: Original first, then Portuguese versions alphabetically, then KJV last
  const sorted = [...comparisons].sort((a, b) => {
    if (a.language === 'he' || a.language === 'el') return -1
    if (b.language === 'he' || b.language === 'el') return 1
    if (a.version === 'KJV') return 1
    if (b.version === 'KJV') return -1
    return a.version.localeCompare(b.version)
  })

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((comp) => {
        const isOriginal = comp.language === 'he' || comp.language === 'el'
        const isKjv = comp.version === 'KJV'

        return (
          <div 
            key={comp.version}
            className={cn(
              "flex flex-col gap-2 p-4 rounded-xl border bg-card",
              isOriginal ? "border-scripture/30 bg-scripture-soft/10" : "border-hairline"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-bold",
                  isOriginal ? "text-scripture" : "text-foreground"
                )}>
                  {comp.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {comp.name}
                </span>
              </div>
              {isKjv && <Badge variant="outline" className="text-[10px] h-5 px-1.5">EN</Badge>}
              {isOriginal && <Badge variant="warning" className="text-[10px] h-5 px-1.5">{testament === 'AT' ? 'HE' : 'GR'}</Badge>}
            </div>
            <p className={cn(
              "font-serif leading-relaxed",
              isOriginal ? "text-scripture text-lg" : "text-foreground text-base",
              comp.language === 'he' ? "text-right" : ""
            )}>
              {comp.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}
