'use client'

import Link from 'next/link'
import { BookOpen, Check, Heart, Lock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

export interface PlanoCard {
  id: string
  titulo: string
  descricao: string | null
  categoria: string | null
  capaCor: string | null
  duracaoDias: number
  visibility: string
  oficial: boolean
  ownerId: string
  isOwner: boolean
  favorito: boolean
  owner: { displayName: string | null; username: string; publicId: string | null }
  matricula: { status: string; diaAtual: number } | null
}

export function PlanoCardView({ plano, onFavorite }: { plano: PlanoCard; onFavorite: (plano: PlanoCard) => void }) {
  const concluido = plano.matricula?.status === 'COMPLETED'
  const progresso = plano.matricula
    ? Math.min(100, Math.round(((concluido ? plano.duracaoDias : plano.matricula.diaAtual - 1) / Math.max(1, plano.duracaoDias)) * 100))
    : 0
  const autor = plano.owner.displayName || plano.owner.username

  return (
    <div className="surface panel-interactive group relative flex flex-col overflow-hidden">
      <Link href={`/planos/${plano.id}`} className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="icon-tile">
            <BookOpen size={18} />
          </span>
          <div className="flex items-center gap-1.5">
            {plano.oficial && <Badge variant="warning"><ShieldCheck size={11} /> Oficial</Badge>}
            {!plano.isOwner && plano.visibility === 'PRIVATE' && <Lock size={13} className="text-subtle" aria-label="Privado" />}
            <Badge variant="outline">{plano.duracaoDias} {plano.duracaoDias === 1 ? 'dia' : 'dias'}</Badge>
          </div>
        </div>

        <h3 className="font-serif text-lg font-semibold leading-tight tracking-tight text-foreground">{plano.titulo}</h3>
        {plano.descricao && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{plano.descricao}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-subtle">
          {plano.categoria && <Badge variant="default">{plano.categoria}</Badge>}
          {!plano.isOwner && <span className="truncate">por {autor}</span>}
          {plano.isOwner && <span className="text-primary-hover">Criado por você</span>}
        </div>

        {plano.matricula && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-subtle">
              <span>{concluido ? 'Concluído' : `Dia ${plano.matricula.diaAtual} de ${plano.duracaoDias}`}</span>
              {concluido && <Check size={13} className="text-success" />}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
              <div className={cn('h-full rounded-full', concluido ? 'bg-success' : 'bg-primary')} style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}
      </Link>

      <button
        type="button"
        onClick={() => onFavorite(plano)}
        aria-pressed={plano.favorito}
        aria-label={plano.favorito ? 'Remover dos favoritos' : 'Favoritar plano'}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-primary"
      >
        <Heart size={16} className={cn(plano.favorito && 'fill-primary text-primary')} />
      </button>
    </div>
  )
}
