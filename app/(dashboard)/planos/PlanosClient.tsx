'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Compass, ListChecks, PlusCircle, Search, Sparkles, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Input } from '@/components/ui/Input'
import { buttonStyles } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'
import { PlanoCardView, type PlanoCard } from './PlanoCard'

type Aba = 'descobrir' | 'meus' | 'concluidos' | 'criados'

const ABAS: Array<{ id: Aba; label: string; icon: typeof Compass }> = [
  { id: 'descobrir', label: 'Descobrir', icon: Compass },
  { id: 'meus', label: 'Em andamento', icon: ListChecks },
  { id: 'concluidos', label: 'Concluídos', icon: Trophy },
  { id: 'criados', label: 'Criados por mim', icon: Sparkles },
]

const ESCOPO_API: Record<Exclude<Aba, 'descobrir'>, string> = {
  meus: 'meus',
  concluidos: 'concluidos',
  criados: 'criados',
}

export function PlanosClient({ catalogoInicial, categorias }: { catalogoInicial: PlanoCard[]; categorias: string[] }) {
  const toast = useToast()
  const [aba, setAba] = useState<Aba>('descobrir')
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [cache, setCache] = useState<Record<Aba, PlanoCard[] | null>>({
    descobrir: catalogoInicial,
    meus: null,
    concluidos: null,
    criados: null,
  })

  async function trocarAba(proxima: Aba) {
    setAba(proxima)
    if (proxima === 'descobrir' || cache[proxima] !== null) return
    setCarregando(true)
    try {
      const response = await fetch(`/api/planos?escopo=${ESCOPO_API[proxima]}`)
      if (!response.ok) throw new Error('load-failed')
      const data = (await response.json()) as { planos: PlanoCard[] }
      setCache((atual) => ({ ...atual, [proxima]: data.planos }))
    } catch {
      toast.error('Não foi possível carregar os planos.')
    } finally {
      setCarregando(false)
    }
  }

  function patchCard(id: string, patch: Partial<PlanoCard>) {
    setCache((atual) => {
      const proximo = { ...atual }
      for (const chave of Object.keys(proximo) as Aba[]) {
        const lista = proximo[chave]
        if (lista) proximo[chave] = lista.map((plano) => (plano.id === id ? { ...plano, ...patch } : plano))
      }
      return proximo
    })
  }

  async function favoritar(plano: PlanoCard) {
    const favoritar = !plano.favorito
    patchCard(plano.id, { favorito: favoritar })
    try {
      const response = await fetch(`/api/planos/${plano.id}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoritar }),
      })
      if (!response.ok) throw new Error('favorite-failed')
    } catch {
      patchCard(plano.id, { favorito: !favoritar })
      toast.error('Não foi possível atualizar o favorito.')
    }
  }

  const filtrada = useMemo(() => {
    const lista = cache[aba] ?? []
    if (aba !== 'descobrir') return lista
    const termo = query.trim().toLocaleLowerCase('pt-BR')
    return lista.filter((plano) => {
      if (categoria && plano.categoria !== categoria) return false
      if (!termo) return true
      return (
        plano.titulo.toLocaleLowerCase('pt-BR').includes(termo) ||
        (plano.descricao ?? '').toLocaleLowerCase('pt-BR').includes(termo)
      )
    })
  }, [aba, cache, query, categoria])

  return (
    <WorkspacePage archetype="library" size="wide">
      <PageHeader
        variant="library"
        index="Planos de leitura"
        eyebrow="Constância e comunhão"
        title="Planos de leitura"
        description="Caminhe pela Palavra dia após dia: versículo, reflexão, uma pergunta para o coração, uma ação prática e uma oração guiada."
        action={
          <Link href="/planos/novo" className={buttonStyles({ variant: 'primary', size: 'md' })}>
            <PlusCircle size={16} /> Novo plano
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias de planos">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => trocarAba(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
              aba === id
                ? 'border-primary/40 bg-primary-soft text-primary'
                : 'border-hairline-strong bg-background/40 text-muted-foreground hover:border-primary/25 hover:text-foreground',
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {aba === 'descobrir' && (
        <div className="mb-6 space-y-4">
          <Input
            icon={<Search size={16} />}
            placeholder="Buscar planos por tema…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar planos"
            inputMode="search"
          />
          {categorias.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={!categoria} onClick={() => setCategoria(null)}>Todas</Chip>
              {categorias.map((cat) => (
                <Chip key={cat} active={categoria === cat} onClick={() => setCategoria((atual) => (atual === cat ? null : cat))}>
                  {cat}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {carregando ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Carregando planos…</p>
      ) : filtrada.length === 0 ? (
        <EmptyState aba={aba} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrada.map((plano) => (
            <PlanoCardView key={plano.id} plano={plano} onFavorite={favoritar} />
          ))}
        </div>
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

function EmptyState({ aba }: { aba: Aba }) {
  const mensagens: Record<Aba, { titulo: string; texto: string }> = {
    descobrir: { titulo: 'Nenhum plano encontrado', texto: 'Ajuste a busca ou crie o seu primeiro plano de leitura.' },
    meus: { titulo: 'Nenhum plano em andamento', texto: 'Comece um plano em "Descobrir" para acompanhar seu progresso aqui.' },
    concluidos: { titulo: 'Você ainda não concluiu planos', texto: 'Cada dia é um passo. A constância edifica.' },
    criados: { titulo: 'Você ainda não criou planos', texto: 'Crie um plano manualmente ou gere um com auxílio de IA.' },
  }
  const { titulo, texto } = mensagens[aba]
  return (
    <div className="empty-state empty-state--compact">
      <span aria-hidden="true" className="empty-state__halo" />
      <span className="empty-state__icon"><Compass size={26} /></span>
      <h2 className="mt-5 text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{texto}</p>
      <Link href="/planos/novo" className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-6' })}>
        <PlusCircle size={15} /> Criar plano
      </Link>
    </div>
  )
}
