'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  Mic,
  Plus,
  Search,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-fetch'
import { useToast, useConfirm } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface Sermao {
  id: string
  titulo: string
  tema?: string | null
  textoBase: string
  introducao?: string | null
  categoria?: string | null
  publicado: boolean
  createdAt: Date
  updatedAt: Date
}

const CATEGORIAS = ['Evangelístico', 'Doutrinário', 'Devocional', 'Profético', 'Pastoral', 'Ensinamento', 'Outro']

export function SermoesClient({ sermoes, initialCursor }: { sermoes: Sermao[]; initialCursor: string | null }) {
  const toast = useToast()
  const confirm = useConfirm()
  const shouldReduceMotion = useReducedMotion()
  const [list, setList] = useState(sermoes)
  const [cursor, setCursor] = useState(initialCursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const carregarMais = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await apiFetch<{ items: Sermao[]; nextCursor: string | null }>(
        `/api/sermoes?cursor=${encodeURIComponent(cursor)}`,
      )
      setList((current) => [...current, ...data.items])
      setCursor(data.nextCursor)
    } catch {
      toast.error('Não foi possível carregar mais sermões.')
    } finally {
      setLoadingMore(false)
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = useMemo(() => list.filter((sermao) => {
    const matchesSearch = !normalizedSearch
      || sermao.titulo.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || sermao.textoBase.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || sermao.tema?.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    const matchesCategory = categoriaFilter === 'all' || sermao.categoria === categoriaFilter
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'published' && sermao.publicado)
      || (statusFilter === 'draft' && !sermao.publicado)
    return matchesSearch && matchesCategory && matchesStatus
  }), [categoriaFilter, list, normalizedSearch, statusFilter])

  const publishedCount = list.filter((sermao) => sermao.publicado).length
  const draftCount = list.length - publishedCount
  const categoryCount = new Set(list.map((sermao) => sermao.categoria).filter(Boolean)).size
  const hasActiveFilters = Boolean(search || categoriaFilter !== 'all' || statusFilter !== 'all')

  const clearFilters = () => {
    setSearch('')
    setCategoriaFilter('all')
    setStatusFilter('all')
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir sermão',
      message: 'Tem certeza que deseja excluir este sermão? Esta ação não pode ser desfeita.',
      danger: true,
      confirmText: 'Excluir sermão',
    })
    if (!confirmed) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/sermoes/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setList((current) => current.filter((sermao) => sermao.id !== id))
        toast.success('Sermão excluído.')
      } else {
        toast.error('Erro ao excluir o sermão.')
      }
    } catch {
      toast.error('Erro de conexão ao excluir.')
    } finally {
      setDeletingId(null)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.045 } },
  }
  const item = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <WorkspacePage size="full" archetype="manuscript">
      <PageHeader
        variant="manuscript"
        index="Altar Digital · Suas Mensagens"
        eyebrow={<><Mic size={13} /> Ministração da Palavra</>}
        title={<>Do coração de Deus <span className="text-gradient">para a Igreja.</span></>}
        description="Escreva, organize e refine cada sermão sob a orientação do Espírito. Mantenha seu fundamento bíblico forte e sua mensagem viva."
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline"><FileText size={12} /> {list.length} {list.length === 1 ? 'mensagem' : 'mensagens'}</Badge>
            <Badge variant="success"><CheckCircle2 size={12} /> {publishedCount} {publishedCount === 1 ? 'publicada' : 'publicadas'}</Badge>
            {draftCount > 0 && <Badge variant="warning">{draftCount} {draftCount === 1 ? 'rascunho' : 'rascunhos'}</Badge>}
          </div>
        }
        action={
          <Link href="/sermoes/novo" className={buttonStyles({ size: 'lg' })}>
            <Plus size={17} /> Novo sermão
          </Link>
        }
      />

      {list.length > 0 && (
        <section className="sermon-ledger" aria-label="Resumo do arquivo homilético">
          <div className="sermon-ledger__heading">
            <span className="index-label">Frutos do Ministério</span>
            <p>Acompanhe quantas sementes você tem preparado para abençoar vidas.</p>
          </div>
          <div className="sermon-ledger__grid">
            {[
              { label: 'No arquivo', value: list.length, icon: Mic, tone: 'text-primary' },
              { label: 'Publicados', value: publishedCount, icon: CheckCircle2, tone: 'text-success' },
              { label: 'Em preparação', value: draftCount, icon: Edit, tone: 'text-scripture' },
              { label: 'Linhas editoriais', value: categoryCount, icon: BookOpen, tone: 'text-info' },
            ].map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="sermon-ledger__entry">
                  <span className="sermon-ledger__index">{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={15} className={metric.tone} />
                  <span><strong>{metric.value}</strong><small>{metric.label}</small></span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="manuscript-toolbar mb-8" aria-label="Busca e filtros de sermões">
        <div className="flex flex-col items-center gap-4">
          
          {/* Busca (Centralizada e Grande) */}
          <div className="group relative w-full max-w-2xl">
            <label htmlFor="sermon-search" className="sr-only">Buscar por título, tema ou texto base</label>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-primary" />
            <input
              id="sermon-search"
              type="search"
              placeholder="Buscar por título, tema ou texto base…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-transparent bg-elevated/50 pl-12 pr-4 text-base text-foreground placeholder:text-subtle shadow-sm transition-all focus:border-primary/30 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Filtros (Centralizados Abaixo) */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* Categoria Modal Trigger */}
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-hairline bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-hairline-strong hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-w-44"
            >
              <span>{categoriaFilter === 'all' ? 'Todas as categorias' : categoriaFilter}</span>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>

            {/* Modal de Categorias */}
            <Modal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Selecione a Categoria">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setCategoriaFilter('all'); setCategoryModalOpen(false) }}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                    categoriaFilter === 'all' ? 'bg-primary-soft text-primary' : 'bg-surface text-foreground hover:bg-elevated'
                  )}
                >
                  Todas as categorias
                  {categoriaFilter === 'all' && <CheckCircle2 size={16} />}
                </button>
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategoriaFilter(cat); setCategoryModalOpen(false) }}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                      categoriaFilter === cat ? 'bg-primary-soft text-primary' : 'bg-surface text-foreground hover:bg-elevated'
                    )}
                  >
                    {cat}
                    {categoriaFilter === cat && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            </Modal>

            {/* Filtros de Status */}
            <div className="flex rounded-xl border border-hairline bg-elevated/70 p-1" aria-label="Filtrar por status">
              {(['all', 'published', 'draft'] as const).map((status) => {
                const label = status === 'all' ? 'Todos' : status === 'published' ? 'Publicados' : 'Rascunhos'
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      statusFilter === status ? 'bg-surface text-foreground shadow-soft' : 'text-subtle hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </section>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="index-label mb-1.5">Arquivo de manuscritos</p>
          <h2 className="font-serif text-xl font-semibold text-foreground">{filtered.length} {filtered.length === 1 ? 'mensagem localizada' : 'mensagens localizadas'}</h2>
        </div>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary transition-colors hover:text-primary-hover">Limpar filtros</button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.section
            key="empty"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="app-panel flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center"
          >
            <span className="icon-tile mb-5"><Filter size={20} /></span>
            <h2 className="text-xl font-semibold text-foreground">{list.length === 0 ? 'O púlpito está pronto' : 'Nenhuma mensagem encontrada'}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {list.length === 0
                ? 'Deixe Deus inspirar seu primeiro sermão. Prepare uma mensagem cheia de graça e sabedoria.'
                : 'Ajuste a busca ou remova os filtros para encontrar outras mensagens.'}
            </p>
            {list.length === 0 ? (
              <Link href="/sermoes/novo" className={buttonStyles({ className: 'mt-6' })}><Plus size={16} /> Criar primeiro sermão</Link>
            ) : (
              <button type="button" onClick={clearFilters} className={buttonStyles({ variant: 'outline', className: 'mt-6' })}>Limpar filtros</button>
            )}
          </motion.section>
        ) : (
          <motion.section key="list" variants={container} initial="hidden" animate="show" className="space-y-3" aria-label="Lista de sermões">
            {filtered.map((sermao, index) => (
              <motion.article
                variants={item}
                key={sermao.id}
                className="sermon-manuscript group"
              >
                <span className="sermon-manuscript__folio" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:p-6">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary sm:flex">
                      <Mic size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={sermao.publicado ? 'success' : 'warning'}>
                          {sermao.publicado ? 'Publicado' : 'Rascunho'}
                        </Badge>
                        {sermao.categoria && <Badge variant="outline">{sermao.categoria}</Badge>}
                      </div>
                      <Link href={`/sermoes/${sermao.id}`} className="inline-block max-w-full">
                        <h3 className="truncate text-lg font-semibold text-foreground transition-colors group-hover:text-primary-hover sm:text-xl">{sermao.titulo}</h3>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium text-scripture"><BookOpen size={13} /> {sermao.textoBase}</span>
                        <span className="flex items-center gap-1.5"><Clock size={13} /> Atualizado em {new Date(sermao.updatedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {(sermao.tema || sermao.introducao) && (
                        <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{sermao.tema || sermao.introducao}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-hairline pt-4 lg:justify-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <Link
                      href={`/sermoes/${sermao.id}`}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-elevated px-4 text-xs font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-overlay lg:flex-none"
                    >
                      Abrir mensagem <ArrowRight size={14} />
                    </Link>
                    <Link
                      href={`/sermoes/${sermao.id}/editar`}
                      aria-label={`Editar ${sermao.titulo}`}
                      title="Editar sermão"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <Edit size={16} />
                    </Link>
                    <Link
                      href={`/sermoes/${sermao.id}`}
                      aria-label={`Visualizar ${sermao.titulo}`}
                      title="Visualizar sermão"
                      className="hidden h-10 w-10 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-elevated hover:text-foreground sm:flex lg:hidden"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(sermao.id)}
                      disabled={deletingId === sermao.id}
                      aria-label={`Excluir ${sermao.titulo}`}
                      title="Excluir sermão"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 size={16} className={deletingId === sermao.id ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.section>
        )}
      </AnimatePresence>

      {cursor && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={carregarMais} disabled={loadingMore} className={buttonStyles({ variant: 'outline' })}>
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </WorkspacePage>
  )
}
