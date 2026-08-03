'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart, ListMusic, Music4, Search, Star } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface HinoItem {
  numero: number
  titulo: string
  categoria: string | null
  autor: string | null
}

export function HinosClient({
  hinos,
  categorias,
  favoritosIniciais,
}: {
  hinos: HinoItem[]
  categorias: string[]
  favoritosIniciais: number[]
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [soFavoritos, setSoFavoritos] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<number>>(() => new Set(favoritosIniciais))
  const [pendente, setPendente] = useState<Set<number>>(() => new Set())

  const filtrados = useMemo(() => {
    const termo = query.trim().toLocaleLowerCase('pt-BR')
    return hinos.filter((hino) => {
      if (categoria && hino.categoria !== categoria) return false
      if (soFavoritos && !favoritos.has(hino.numero)) return false
      if (!termo) return true
      return (
        hino.titulo.toLocaleLowerCase('pt-BR').includes(termo) ||
        String(hino.numero) === termo ||
        String(hino.numero).startsWith(termo)
      )
    })
  }, [hinos, query, categoria, soFavoritos, favoritos])

  async function alternarFavorito(numero: number) {
    if (pendente.has(numero)) return
    const favoritar = !favoritos.has(numero)

    setFavoritos((atual) => {
      const proximo = new Set(atual)
      if (favoritar) proximo.add(numero)
      else proximo.delete(numero)
      return proximo
    })
    setPendente((atual) => new Set(atual).add(numero))

    try {
      const response = await fetch(`/api/hinos/${numero}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hinario: 'harpa', favoritar }),
      })
      if (!response.ok) throw new Error('favorite-failed')
    } catch {
      // Reverte o estado otimista quando a chamada falha.
      setFavoritos((atual) => {
        const proximo = new Set(atual)
        if (favoritar) proximo.delete(numero)
        else proximo.add(numero)
        return proximo
      })
      toast.error('Não foi possível atualizar o favorito. Tente novamente.')
    } finally {
      setPendente((atual) => {
        const proximo = new Set(atual)
        proximo.delete(numero)
        return proximo
      })
    }
  }

  const vazioTotal = hinos.length === 0

  return (
    <WorkspacePage archetype="reader" size="wide">
      <PageHeader
        variant="library"
        index="Hinário · Harpa Cristã"
        eyebrow="Louvor e meditação"
        title="Harpa Cristã"
        description="Cante, medite e guarde os hinos que edificam. Escolha um hino para entrar no modo de leitura, sem distrações."
        aside={
          <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
            <span className="inline-flex items-center gap-1.5"><ListMusic size={14} className="text-primary" /> {hinos.length} hinos</span>
            <span className="inline-flex items-center gap-1.5"><Heart size={14} className="text-primary" /> {favoritos.size} favoritos</span>
          </div>
        }
      />

      {vazioTotal ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <Input
              icon={<Search size={16} />}
              placeholder="Buscar por número ou título…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar hino"
              inputMode="search"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Chip active={!categoria && !soFavoritos} onClick={() => { setCategoria(null); setSoFavoritos(false) }}>
                Todos
              </Chip>
              <Chip active={soFavoritos} onClick={() => { setSoFavoritos((v) => !v); setCategoria(null) }}>
                <Star size={13} className={soFavoritos ? 'fill-current' : ''} /> Favoritos
              </Chip>
              {categorias.map((cat) => (
                <Chip key={cat} active={categoria === cat} onClick={() => { setCategoria((atual) => (atual === cat ? null : cat)); setSoFavoritos(false) }}>
                  {cat}
                </Chip>
              ))}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="surface p-8 text-center text-sm text-muted-foreground">
              Nenhum hino encontrado para esta busca.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Lista de hinos">
              {filtrados.map((hino) => {
                const favoritado = favoritos.has(hino.numero)
                return (
                  <li key={hino.numero} className="group relative">
                    <Link
                      href={`/hinos/${hino.numero}`}
                      className="surface panel-interactive flex items-center gap-3.5 p-3.5 pr-12"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft font-serif text-sm font-semibold text-primary">
                        {hino.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[15px] font-medium text-foreground">{hino.titulo}</span>
                        {hino.categoria && <span className="mt-0.5 block truncate text-xs text-subtle">{hino.categoria}</span>}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => alternarFavorito(hino.numero)}
                      disabled={pendente.has(hino.numero)}
                      aria-pressed={favoritado}
                      aria-label={favoritado ? `Remover hino ${hino.numero} dos favoritos` : `Favoritar hino ${hino.numero}`}
                      className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-primary disabled:opacity-50"
                    >
                      <Heart size={17} className={cn(favoritado && 'fill-primary text-primary')} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </WorkspacePage>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary-soft text-primary'
          : 'border-hairline-strong bg-background/40 text-muted-foreground hover:border-primary/25 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="empty-state empty-state--compact">
      <span aria-hidden="true" className="empty-state__halo" />
      <span className="empty-state__icon"><Music4 size={26} /></span>
      <h2 className="mt-5 text-lg font-semibold text-foreground">Não foi possível carregar o hinário</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Verifique se o arquivo <code className="rounded bg-elevated px-1.5 py-0.5 text-xs text-foreground">Harpa.json</code> está na raiz do projeto.
      </p>
    </div>
  )
}
