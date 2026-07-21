'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUpRight,
  Book,
  BookOpen,
  BrainCircuit,
  Clock,
  LibraryBig,
  Mic,
  Search,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Feedback'

interface SermonSearchResult {
  id: string
  titulo: string
  textoBase: string | null
  createdAt: string
}

interface LessonSearchResult {
  id: string
  titulo: string
  textoBase: string | null
  data: string | null
}

interface SearchResult {
  localResults: {
    sermons: SermonSearchResult[]
    lessons: LessonSearchResult[]
  }
  aiResults: {
    versiculos: { referencia: string; texto: string; explicacaoCurta: string }[]
    conceitos: string[]
    sugestaoSermao: string
  }
}

type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

const DISCOVERY_CARDS = [
  { icon: BookOpen, title: 'Encontre pela intenção', description: 'Pesquise “coragem em tempos difíceis” sem precisar lembrar a referência exata.' },
  { icon: BrainCircuit, title: 'Conecte os contextos', description: 'A IA relaciona passagens, conceitos teológicos e aplicações semânticas.' },
  { icon: LibraryBig, title: 'Reencontre seu acervo', description: 'Sermões e lições pessoais aparecem junto da pesquisa bíblica.' },
]

const EXAMPLE_QUERIES = ['Graça em Romanos', 'Fé em tempos difíceis', 'O bom pastor']

export default function BuscaInteligentePage() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [searchedQuery, setSearchedQuery] = useState('')

  const isLoading = status === 'loading'
  const totalLocalResults = results
    ? results.localResults.sermons.length + results.localResults.lessons.length
    : 0
  const hasAiResults = Boolean(
    results && (
      results.aiResults.versiculos.length > 0
      || results.aiResults.conceitos.length > 0
      || results.aiResults.sugestaoSermao
    ),
  )
  const hasAnyResult = totalLocalResults > 0 || hasAiResults

  const runSearch = async () => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery || isLoading) return

    setStatus('loading')
    setResults(null)
    setSearchedQuery(normalizedQuery)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: normalizedQuery }),
      })
      if (!response.ok) throw new Error('search-failed')
      const data: SearchResult = await response.json()
      setResults(data)
      setStatus('success')
    } catch {
      setStatus('error')
      toast.error('Não foi possível concluir a busca.')
    }
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runSearch()
  }

  return (
    <WorkspacePage size="wide" archetype="atlas">
      <PageHeader
        variant="atlas"
        index="Atlas semântico · consulta 01"
        eyebrow={<><Search size={13} /> Descoberta conectada</>}
        title={<>Procure uma ideia. <span className="text-gradient">Encontre o caminho.</span></>}
        description="Atravesse Escritura, doutrina, sermões e lições como um único mapa de conhecimento — com seu acervo privado sempre em primeiro plano."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <span className="index-label mr-1">Rotas sugeridas</span>
            {EXAMPLE_QUERIES.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="atlas-query-chip"
              >
                <span>{String(index + 1).padStart(2, '0')}</span> {example}
              </button>
            ))}
          </div>
        }
      />

      <form onSubmit={handleSearch} role="search" className="atlas-search-console atlas-surface">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Buscar na Bíblia, sermões e lições"
            placeholder="Ex.: fé em tempos difíceis, Romanos 8, graça…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            icon={<Search size={18} />}
            className="h-12 border-transparent bg-background/40 text-base shadow-none hover:border-hairline focus-visible:bg-background/55"
          />
        </div>
        <Button type="submit" size="lg" loading={isLoading} disabled={!query.trim()} className="w-full sm:w-auto">
          {!isLoading && <BrainCircuit size={17} />}
          {isLoading ? 'Conectando ideias…' : 'Buscar conexões'}
        </Button>
      </form>

      <div className="sr-only" aria-live="polite">
        {status === 'loading' && `Buscando resultados para ${searchedQuery}.`}
        {status === 'success' && `Busca concluída para ${searchedQuery}.`}
        {status === 'error' && 'A busca não pôde ser concluída.'}
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.section
            key="discovery"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            className="atlas-discovery atlas-surface"
            aria-labelledby="atlas-discovery-title"
          >
            <div className="atlas-discovery__legend">
              <p className="index-label text-info">Como o atlas percorre sua pergunta</p>
              <h2 id="atlas-discovery-title">Uma consulta, três camadas de descoberta.</h2>
              <p>O Biblion começa no sentido da pergunta, cruza contextos e, por fim, reencontra o que você já produziu.</p>
              <div aria-hidden="true" className="atlas-discovery__coordinates">
                <span>ESCRITURA</span><span>DOUTRINA</span><span>ACERVO</span>
              </div>
            </div>
            <ol className="atlas-discovery__paths">
              {DISCOVERY_CARDS.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="atlas-path">
                  <span className="atlas-path__number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="atlas-path__icon"><Icon size={18} /></span>
                  <span className="min-w-0">
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </motion.section>
        )}

        {status === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="space-y-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-2xl border border-hairline bg-surface p-6">
                  <div className="skeleton h-5 w-28 rounded-full" />
                  <div className="skeleton mt-5 h-5 w-full rounded" />
                  <div className="skeleton mt-2 h-5 w-5/6 rounded" />
                  <div className="skeleton mt-5 h-3.5 w-2/3 rounded" />
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-hairline bg-surface p-6">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="skeleton mt-6 h-5 w-3/4 rounded" />
              <div className="skeleton mt-3 h-3.5 w-full rounded" />
              <div className="skeleton mt-2 h-3.5 w-4/5 rounded" />
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon={Search}
              eyebrow="Busca interrompida"
              title="Não conseguimos consultar o acervo."
              description="Verifique sua conexão e tente novamente. Sua consulta permanece no campo acima."
              action={<Button onClick={() => void runSearch()}>Tentar novamente</Button>}
            />
          </motion.div>
        )}

        {status === 'success' && results && !hasAnyResult && (
          <motion.div key="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon={Search}
              eyebrow="Nenhuma conexão"
              title={<>Nada encontrado para “{searchedQuery}”.</>}
              description="Tente uma ideia mais ampla, uma referência bíblica ou uma palavra relacionada ao tema."
            />
          </motion.div>
        )}

        {status === 'success' && results && hasAnyResult && (
          <motion.div
            key="results"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <section aria-labelledby="ai-insights-title">
              <SectionHeading
                icon={Sparkles}
                title={<span id="ai-insights-title">Mapa de insights</span>}
                description={`Conexões semânticas para “${searchedQuery}”.`}
                action={<Badge variant="default">Gerado com IA</Badge>}
              />

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.65fr)]">
                <div className="space-y-4">
                  {results.aiResults.versiculos.map((verse) => (
                    <article key={`${verse.referencia}-${verse.texto}`} className="reader-paper p-5 sm:p-6">
                      <div className="relative">
                        <Badge variant="warning"><BookOpen size={12} /> {verse.referencia}</Badge>
                        <blockquote className="mt-4 font-serif text-lg leading-8 text-foreground/90 sm:text-xl">“{verse.texto}”</blockquote>
                        <p className="mt-5 border-l-2 border-primary/35 pl-4 text-sm leading-7 text-muted-foreground">{verse.explicacaoCurta}</p>
                      </div>
                    </article>
                  ))}
                  {results.aiResults.versiculos.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-hairline p-7 text-sm text-subtle">Nenhuma passagem específica foi sugerida.</div>
                  )}
                </div>

                <div className="space-y-5">
                  <article className="surface p-5 sm:p-6">
                    <p className="eyebrow flex items-center gap-2 text-primary-hover"><BrainCircuit size={14} /> Conceitos relacionados</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {results.aiResults.conceitos.length > 0
                        ? results.aiResults.conceitos.map((concept) => <Badge key={concept} variant="outline">{concept}</Badge>)
                        : <p className="text-sm text-subtle">Nenhum conceito adicional.</p>}
                    </div>
                  </article>

                  {results.aiResults.sugestaoSermao && (
                    <article className="surface form-section--accent p-5 sm:p-6">
                      <p className="eyebrow flex items-center gap-2 text-primary-hover"><Mic size={14} /> Ponto de partida</p>
                      <p className="mt-4 font-serif text-base italic leading-8 text-foreground/90">“{results.aiResults.sugestaoSermao}”</p>
                      <Link href="/sermoes/novo" className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-5 w-full' })}>
                        Transformar em sermão <ArrowUpRight size={14} />
                      </Link>
                    </article>
                  )}
                </div>
              </div>
            </section>

            <section className="border-t border-hairline pt-8" aria-labelledby="local-results-title">
              <SectionHeading
                icon={LibraryBig}
                title={<span id="local-results-title">Resultados no seu acervo</span>}
                description="Conteúdo privado associado a esta conta."
                action={<Badge variant="outline">{totalLocalResults} {totalLocalResults === 1 ? 'resultado' : 'resultados'}</Badge>}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <ResultColumn title="Sermões" icon={Mic} empty="Nenhum sermão encontrado com este tema.">
                  {results.localResults.sermons.map((sermon) => (
                    <Link href={`/sermoes/${sermon.id}`} key={sermon.id} className="group block rounded-xl border border-hairline bg-elevated/45 p-4 transition-all hover:border-primary/25 hover:bg-elevated">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-foreground transition-colors group-hover:text-primary-hover">{sermon.titulo}</h3>
                        <ArrowUpRight size={14} className="shrink-0 text-subtle transition-colors group-hover:text-primary" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                        {sermon.textoBase && <span className="text-scripture">{sermon.textoBase}</span>}
                        {sermon.createdAt && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(sermon.createdAt).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </Link>
                  ))}
                </ResultColumn>

                <ResultColumn title="Lições EBD" icon={Book} empty="Nenhuma lição encontrada com este tema.">
                  {results.localResults.lessons.map((lesson) => (
                    <Link href={`/ebd/${lesson.id}`} key={lesson.id} className="group block rounded-xl border border-hairline bg-elevated/45 p-4 transition-all hover:border-primary/25 hover:bg-elevated">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-foreground transition-colors group-hover:text-primary-hover">{lesson.titulo}</h3>
                        <ArrowUpRight size={14} className="shrink-0 text-subtle transition-colors group-hover:text-primary" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                        {lesson.textoBase && <span className="text-scripture">{lesson.textoBase}</span>}
                        {lesson.data && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(lesson.data).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </Link>
                  ))}
                </ResultColumn>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </WorkspacePage>
  )
}

function ResultColumn({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string
  icon: typeof Mic
  empty: string
  children: React.ReactNode
}) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <div className="surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon size={15} className="text-primary" /> {title}</h3>
        <Badge variant="outline">{count}</Badge>
      </div>
      {count > 0 ? <div className="space-y-3">{children}</div> : <div className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-subtle">{empty}</div>}
    </div>
  )
}
