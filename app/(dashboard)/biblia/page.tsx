'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Filter,
  Library,
  Search,
} from 'lucide-react'
import { LIVROS_BIBLIA } from '@/data/livros'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'

const QUICK_STARTS = [
  { name: 'João', description: 'Conheça a vida e a obra de Jesus', tone: 'primary', index: '01' },
  { name: 'Salmos', description: 'Orações para cada estação da vida', tone: 'scripture', index: '02' },
  { name: 'Romanos', description: 'Uma síntese profunda do Evangelho', tone: 'info', index: '03' },
] as const

export default function BibliaPage() {
  const [search, setSearch] = useState('')
  const [testamento, setTestamento] = useState<'ALL' | 'AT' | 'NT'>('ALL')
  const shouldReduceMotion = useReducedMotion()

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filteredLivros = useMemo(() => LIVROS_BIBLIA.filter((livro) => {
    const matchesSearch = !normalizedSearch
      || livro.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || livro.abreviacao.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || livro.categoria.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    const matchesTestament = testamento === 'ALL' || livro.testamento === testamento
    return matchesSearch && matchesTestament
  }), [normalizedSearch, testamento])

  const atLivros = filteredLivros.filter((livro) => livro.testamento === 'AT')
  const ntLivros = filteredLivros.filter((livro) => livro.testamento === 'NT')
  const chapterCount = LIVROS_BIBLIA.reduce((total, livro) => total + livro.capitulos, 0)

  const resetFilters = () => {
    setSearch('')
    setTestamento('ALL')
  }

  const renderBooks = (books: typeof LIVROS_BIBLIA, title: string, subtitle: string) => {
    const oldTestament = books[0]?.testamento === 'AT'
    return (
      <motion.section
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bible-testament"
        data-covenant={oldTestament ? 'old' : 'new'}
        aria-labelledby={`${books[0]?.testamento ?? 'books'}-title`}
      >
        <div className="bible-testament__header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bible-testament__seal"><Library size={15} /></span>
            <div className="min-w-0">
              <p className="index-label">{oldTestament ? 'Primeira coleção' : 'Segunda coleção'}</p>
              <h2 id={`${books[0]?.testamento ?? 'books'}-title`}>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <Badge variant={oldTestament ? 'warning' : 'default'}>{books.length} livros</Badge>
        </div>

        <div className="bible-shelf">
          {books.map((livro) => {
            const canonicalIndex = LIVROS_BIBLIA.findIndex((entry) => entry.nome === livro.nome) + 1
            return (
              <Link
                key={livro.nome}
                href={`/biblia/${encodeURIComponent(livro.nome)}`}
                prefetch={false}
                className="bible-volume group"
              >
                <span aria-hidden="true" className="bible-volume__spine" />
                <span className="bible-volume__index">{String(canonicalIndex).padStart(2, '0')}</span>
                <span className="bible-volume__abbreviation">{livro.abreviacao}</span>
                <span className="mt-auto block min-w-0 pt-7">
                  <span className="bible-volume__category">{livro.categoria}</span>
                  <span className="bible-volume__title">{livro.nome}</span>
                  <span className="bible-volume__meta">
                    <span><BookOpen size={12} /> {livro.capitulos} capítulos</span>
                    <ChevronRight size={14} />
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </motion.section>
    )
  }

  return (
    <WorkspacePage size="full" archetype="library">
      <PageHeader
        variant="library"
        index="Códice bíblico · coleção canônica"
        eyebrow={<><BookOpen size={13} /> Escritura</>}
        title={<>Sessenta e seis livros. <span className="text-gradient-gold">Uma só história.</span></>}
        description="Percorra a coleção bíblica como um códice vivo: encontre um livro, escolha sua tradução e leia antes de abrir as camadas de contexto e aplicação."
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline"><BookOpen size={12} /> 66 livros</Badge>
            <Badge variant="outline">{chapterCount.toLocaleString('pt-BR')} capítulos</Badge>
            <Badge variant="warning">Antiga e Nova Aliança</Badge>
          </div>
        }
        action={
          <Link href="/biblia/João" className={buttonStyles({ variant: 'outline', size: 'lg', className: 'border-scripture/30 text-scripture hover:border-scripture/50' })}>
            Começar por João <ArrowRight size={16} />
          </Link>
        }
      />

      <section className="bible-entry-rail" aria-labelledby="reading-paths-title">
        <div className="bible-entry-rail__heading">
          <p className="index-label text-scripture">Portas de entrada</p>
          <h2 id="reading-paths-title">Comece por uma intenção</h2>
        </div>
        <div className="bible-entry-rail__links">
          {QUICK_STARTS.map((entry) => (
            <Link key={entry.name} href={`/biblia/${encodeURIComponent(entry.name)}`} data-tone={entry.tone} className="bible-entry-link group">
              <span className="bible-entry-link__index">{entry.index}</span>
              <span className="bible-entry-link__icon"><BookOpen size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-base font-semibold text-foreground">{entry.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.description}</span>
              </span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="reading-dock bible-catalog-toolbar sticky top-3 z-20 mb-7 flex flex-col gap-2 p-2 sm:flex-row" aria-label="Busca e filtros da Bíblia">
        <div className="group relative flex-1">
          <label htmlFor="book-search" className="sr-only">Buscar livro, abreviação ou categoria</label>
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-scripture" />
          <input
            id="book-search"
            type="search"
            placeholder="Buscar livro, abreviação ou categoria…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-[0.72rem] bg-transparent pl-10 pr-4 text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 rounded-[0.72rem] border border-hairline bg-elevated/55 p-1" aria-label="Filtrar por testamento">
          {(['ALL', 'AT', 'NT'] as const).map((value) => {
            const label = value === 'ALL' ? 'Toda a Bíblia' : value === 'AT' ? 'Antigo' : 'Novo'
            return (
              <button
                key={value}
                type="button"
                aria-pressed={testamento === value}
                onClick={() => setTestamento(value)}
                className={cn(
                  'flex-1 whitespace-nowrap rounded-[0.52rem] px-3 py-2 text-xs font-medium transition-all sm:flex-none',
                  testamento === value ? 'bg-scripture-soft text-scripture shadow-soft' : 'text-subtle hover:text-foreground',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="mb-6 flex items-center justify-between gap-4 border-b border-hairline pb-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Mostrando <span className="font-semibold text-foreground">{filteredLivros.length}</span> {filteredLivros.length === 1 ? 'livro' : 'livros'}
        </p>
        {(search || testamento !== 'ALL') && (
          <button type="button" onClick={resetFilters} className="text-xs font-semibold text-scripture transition-colors hover:text-foreground">
            Limpar filtros
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {filteredLivros.length === 0 ? (
          <motion.div
            key="empty"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="folio-surface flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-scripture/20 bg-scripture-soft text-scripture"><Filter size={20} /></span>
            <h2 className="font-serif text-xl font-semibold text-foreground">Nenhum volume nesta estante</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tente outro nome, uma abreviação como “Rm” ou remova o filtro de testamento.</p>
            <button type="button" onClick={resetFilters} className={buttonStyles({ variant: 'outline', className: 'mt-6' })}>
              Limpar filtros
            </button>
          </motion.div>
        ) : (
          <motion.div key={`${testamento}-${normalizedSearch}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {(testamento === 'ALL' || testamento === 'AT') && atLivros.length > 0
              && renderBooks(atLivros, 'Antigo Testamento', 'Criação, aliança, sabedoria, profecia e esperança messiânica.')}
            {(testamento === 'ALL' || testamento === 'NT') && ntLivros.length > 0
              && renderBooks(ntLivros, 'Novo Testamento', 'Cristo, a Igreja e a consumação de todas as coisas.')}
          </motion.div>
        )}
      </AnimatePresence>
    </WorkspacePage>
  )
}
