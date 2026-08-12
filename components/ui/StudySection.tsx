'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Markdown } from '@/components/ui/Markdown'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudySectionProps {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  content: string
  isExtensive?: boolean
  accentColor?: string
  defaultOpen?: boolean
}

export function StudySection({ 
  title, 
  icon: Icon, 
  content, 
  isExtensive,
  accentColor = 'border-primary',
  defaultOpen = false
}: StudySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-2xl bg-card border border-hairline transition-all duration-300",
      isOpen ? "shadow-soft" : ""
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-5 w-full text-left transition-colors hover:bg-white/[0.02]",
          "border-l-4",
          accentColor
        )}
      >
        <div className={cn("text-muted-foreground", isOpen ? "text-foreground" : "")}>
          <Icon size={22} />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <h3 className="font-semibold text-lg">{title}</h3>
          {isExtensive && (
            <Badge variant="outline" className="hidden sm:inline-flex bg-background/50">
              Estudo Extenso
            </Badge>
          )}
        </div>
        <ChevronDown 
          size={20} 
          className={cn(
            "text-muted-foreground transition-transform duration-300",
            isOpen ? "rotate-180" : ""
          )} 
        />
      </button>

      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0 border-t border-hairline mt-2">
            <div className="prose prose-invert prose-headings:font-semibold prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary-hover max-w-none prose-sm sm:prose-base">
              <Markdown>{content}</Markdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
