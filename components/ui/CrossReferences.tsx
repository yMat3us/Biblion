'use client'

import { CrossReference } from '@/lib/ai-audit-types'
import { InteractiveVerse } from '@/components/ui/InteractiveVerse'
import { cn } from '@/lib/utils'
import { GitMerge, Lightbulb, Link2, Sparkles } from 'lucide-react'

interface CrossReferencesProps {
  references: CrossReference[]
}

const TYPE_CONFIG = {
  paralelo: {
    label: 'Paralelos Diretos',
    icon: Link2,
    color: 'text-info',
    bg: 'bg-info/10',
  },
  alusao: {
    label: 'Alusões',
    icon: Lightbulb,
    color: 'text-scripture',
    bg: 'bg-scripture-soft',
  },
  tipologia: {
    label: 'Tipologia',
    icon: GitMerge,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  profecia: {
    label: 'Cumprimento Profético',
    icon: Sparkles,
    color: 'text-success',
    bg: 'bg-success/10',
  }
}

export function CrossReferences({ references }: CrossReferencesProps) {
  // Group by type
  const grouped = {
    paralelo: references.filter(r => r.tipo === 'paralelo'),
    alusao: references.filter(r => r.tipo === 'alusao'),
    tipologia: references.filter(r => r.tipo === 'tipologia'),
    profecia: references.filter(r => r.tipo === 'profecia'),
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {(Object.entries(grouped) as [keyof typeof grouped, CrossReference[]][]).map(([type, refs]) => {
        if (refs.length === 0) return null
        const config = TYPE_CONFIG[type]
        const Icon = config.icon

        return (
          <div key={type} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", config.bg, config.color)}>
                <Icon size={16} />
              </div>
              <h4 className="font-medium text-foreground">{config.label}</h4>
            </div>
            
            <div className="space-y-4">
              {refs.map((ref, i) => (
                <div key={i} className="flex flex-col gap-1.5 items-start">
                  <InteractiveVerse reference={ref.referencia} />
                  <p className="text-sm text-muted-foreground leading-relaxed pl-1">
                    {ref.descricao}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
