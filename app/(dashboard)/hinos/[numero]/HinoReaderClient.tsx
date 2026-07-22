'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Heart, Headphones, Maximize2, Minimize2, Music4, Type } from 'lucide-react'
import { DetailHeader, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface Neighbor {
  numero: number
  titulo: string
}

interface HinoReader {
  numero: number
  titulo: string
  autor: string | null
  categoria: string | null
  tom: string | null
  estrofes: string[]
  coro: string | null
  audioUrl: string | null
  favorito: boolean
  anterior: Neighbor | null
  proximo: Neighbor | null
}

const ZOOM_CLASSES = ['text-base sm:text-lg', 'text-lg sm:text-xl', 'text-xl sm:text-2xl'] as const

export function HinoReaderClient({ hino }: { hino: HinoReader }) {
  const toast = useToast()
  const [favorito, setFavorito] = useState(hino.favorito)
  const [salvando, setSalvando] = useState(false)
  const [foco, setFoco] = useState(false)
  const [zoom, setZoom] = useState(1)

  async function alternarFavorito() {
    if (salvando) return
    const proximo = !favorito
    setFavorito(proximo)
    setSalvando(true)
    try {
      const response = await fetch(`/api/hinos/${hino.numero}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hinario: 'harpa', favoritar: proximo }),
      })
      if (!response.ok) throw new Error('favorite-failed')
      toast.success(proximo ? 'Hino adicionado aos favoritos.' : 'Hino removido dos favoritos.')
    } catch {
      setFavorito(!proximo)
      toast.error('Não foi possível atualizar o favorito.')
    } finally {
      setSalvando(false)
    }
  }

  const textClass = ZOOM_CLASSES[zoom]

  return (
    <WorkspacePage archetype="reader" size="compact" className={cn(foco && 'max-w-3xl')}>
      {!foco && (
        <DetailHeader
          variant="reader"
          backHref="/hinos"
          backLabel="Hinário"
          index={`Harpa Cristã · nº ${hino.numero}`}
          icon={Music4}
          eyebrow={hino.categoria ?? 'Louvor'}
          title={hino.titulo}
          meta={
            <>
              {hino.tom && <Badge variant="outline">Tom {hino.tom}</Badge>}
              {hino.autor && <Badge variant="outline">{hino.autor}</Badge>}
              <Badge variant={favorito ? 'success' : 'outline'}>
                <Heart size={11} className={cn(favorito && 'fill-current')} /> {favorito ? 'Favorito' : 'Favoritar'}
              </Badge>
            </>
          }
          actions={
            <>
              <Button
                variant={favorito ? 'primary' : 'outline'}
                size="sm"
                onClick={alternarFavorito}
                loading={salvando}
                aria-pressed={favorito}
              >
                <Heart size={15} className={cn(favorito && 'fill-current')} />
                {favorito ? 'Favoritado' : 'Favoritar'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setFoco(true)}>
                <Maximize2 size={15} /> Modo leitura
              </Button>
            </>
          }
        />
      )}

      {/* Controles discretos do modo leitura */}
      <div className={cn('mb-5 flex items-center justify-between gap-3', foco && 'mt-2')}>
        <div className="flex items-center gap-1.5" role="group" aria-label="Tamanho do texto">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
            disabled={zoom === 0}
            aria-label="Diminuir texto"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-subtle transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Type size={13} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_CLASSES.length - 1, z + 1))}
            disabled={zoom === ZOOM_CLASSES.length - 1}
            aria-label="Aumentar texto"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-subtle transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Type size={18} />
          </button>
        </div>

        {foco && (
          <button
            type="button"
            onClick={() => setFoco(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Minimize2 size={14} /> Sair do modo leitura
          </button>
        )}
      </div>

      {foco && (
        <p className="mb-8 text-center font-serif text-2xl font-semibold tracking-tight text-foreground">
          {hino.numero}. {hino.titulo}
        </p>
      )}

      <article className={cn('reader-paper mx-auto px-5 py-7 font-serif leading-loose text-foreground/90 sm:px-8 sm:py-9', textClass)}>
        {hino.estrofes.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">A letra deste hino ainda não foi cadastrada.</p>
        ) : (
          hino.estrofes.map((estrofe, index) => (
            <Fragment key={index}>
              <section className="mb-8 flex gap-4">
                <span aria-hidden="true" className="select-none pt-1 font-sans text-sm font-semibold text-scripture">
                  {index + 1}
                </span>
                <p className="whitespace-pre-line">{estrofe}</p>
              </section>

              {index === 0 && hino.coro && (
                <section className="mb-8 rounded-2xl border-l-2 border-scripture/45 bg-scripture-soft py-3 pl-5 pr-4">
                  <p className="mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-scripture">Coro</p>
                  <p className="whitespace-pre-line italic">{hino.coro}</p>
                </section>
              )}
            </Fragment>
          ))
        )}
      </article>

      {/* Estrutura pronta para áudio futuro */}
      <div className="mx-auto mt-10 border-t border-hairline pt-6">
        {hino.audioUrl ? (
          <audio controls preload="none" className="w-full" aria-label={`Áudio do hino ${hino.numero}`}>
            <source src={hino.audioUrl} />
            Seu navegador não suporta áudio incorporado.
          </audio>
        ) : (
          <p className="flex items-center justify-center gap-2 text-xs text-subtle">
            <Headphones size={14} /> Áudio deste hino em breve.
          </p>
        )}
      </div>

      {/* UX consciente: convite à meditação, sem gatilhos de permanência */}
      <p className="mx-auto mt-8 text-center text-sm italic leading-relaxed text-muted-foreground">
        Reserve um instante para meditar e orar sobre estas palavras.
      </p>

      {!foco && (hino.anterior || hino.proximo) && (
        <nav className="mt-10 flex items-center justify-between gap-3" aria-label="Navegação entre hinos">
          {hino.anterior ? (
            <Link href={`/hinos/${hino.anterior.numero}`} className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'min-w-0' })}>
              <ChevronLeft size={15} />
              <span className="truncate">{hino.anterior.numero}. {hino.anterior.titulo}</span>
            </Link>
          ) : (
            <span />
          )}
          {hino.proximo ? (
            <Link href={`/hinos/${hino.proximo.numero}`} className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'min-w-0' })}>
              <span className="truncate">{hino.proximo.numero}. {hino.proximo.titulo}</span>
              <ChevronRight size={15} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </WorkspacePage>
  )
}
