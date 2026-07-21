'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  BookMarked,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
  LibraryBig,
  ListFilter,
  Loader2,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { getLivro, LIVROS_BIBLIA } from '@/data/livros'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface BibleVerse {
  verse: number
  text: string
}

interface VersionComparison {
  versao: string
  texto: string
}

interface VerseInsights {
  exegese: string
  hermeneutica: string
  aplicacao: string
  homiletica: string
  versiculosRelacionados: string[]
  comparacaoVersoes: VersionComparison[]
}

interface ChapterInsights {
  temaGeral: string
  contextoHistoricoCultural: string
  cenario: string
  exegese: string
  hermeneutica: string
  referenciasMessianicasEscatologicas: string
  tradicaoCrista: string
  visoesTeologicas: string
  aplicacao: string
  homiletica: string
  curiosidades: string
}

interface BookInsights {
  autor: string
  dataELocal: string
  proposito: string
  publicoAlvo: string
  contextoHistorico: string
  temasPrincipais: string
  esboco: string
  cristocentrismo: string
}

interface VersesResult {
  requestKey: string
  verses: BibleVerse[]
}

const BIBLE_VERSIONS = [
  ['ACF', 'Almeida Corrigida Fiel'],
  ['ALM1911', 'Almeida 1911'],
  ['ARA', 'Almeida Revista e Atualizada'],
  ['ARC', 'Almeida Revista e Corrigida'],
  ['AS21', 'Almeida Século 21'],
  ['JFAA', 'João Ferreira de Almeida Atualizada'],
  ['KJA', 'King James Atualizada'],
  ['KJF', 'King James Fiel'],
  ['NAA', 'Nova Almeida Atualizada'],
  ['NBV', 'Nova Bíblia Viva'],
  ['NTLH', 'Nova Tradução na Linguagem de Hoje'],
  ['NVI', 'Nova Versão Internacional'],
  ['NVT', 'Nova Versão Transformadora'],
] as const

const VERSE_INSIGHT_SECTIONS: Array<{ label: string; key: keyof Pick<VerseInsights, 'exegese' | 'hermeneutica' | 'aplicacao' | 'homiletica'> }> = [
  { label: 'Exegese', key: 'exegese' },
  { label: 'Hermenêutica', key: 'hermeneutica' },
  { label: 'Aplicação', key: 'aplicacao' },
  { label: 'Homilética', key: 'homiletica' },
]

const BOOK_INSIGHT_SECTIONS: Array<{ label: string; key: keyof BookInsights; scripture?: boolean }> = [
  { label: 'Autoria', key: 'autor' },
  { label: 'Data e local', key: 'dataELocal' },
  { label: 'Propósito', key: 'proposito' },
  { label: 'Público-alvo', key: 'publicoAlvo' },
  { label: 'Contexto histórico', key: 'contextoHistorico' },
  { label: 'Temas principais', key: 'temasPrincipais' },
  { label: 'Cristocentrismo', key: 'cristocentrismo' },
  { label: 'Esboço do livro', key: 'esboco', scripture: true },
]

const CHAPTER_INSIGHT_SECTIONS: Array<{ label: string; key: keyof ChapterInsights; scripture?: boolean; wide?: boolean }> = [
  { label: 'Tema geral', key: 'temaGeral', wide: true },
  { label: 'Contexto histórico e cultural', key: 'contextoHistoricoCultural' },
  { label: 'Cenário', key: 'cenario' },
  { label: 'Exegese', key: 'exegese' },
  { label: 'Hermenêutica', key: 'hermeneutica' },
  { label: 'Aplicação', key: 'aplicacao' },
  { label: 'Referências messiânicas e escatológicas', key: 'referenciasMessianicasEscatologicas' },
  { label: 'Tradição cristã', key: 'tradicaoCrista' },
  { label: 'Visões teológicas', key: 'visoesTeologicas' },
  { label: 'Curiosidades', key: 'curiosidades' },
  { label: 'Homilética e esboço', key: 'homiletica', scripture: true, wide: true },
]

export default function LivroPage() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const params = useParams<{ livro: string }>()
  const livroNome = decodeURIComponent(params.livro)
  const livro = getLivro(livroNome)
  const [capitulo, setCapitulo] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [aiLoading, setAiLoading] = useState<number | null>(null)
  const [aiInsights, setAiInsights] = useState<Record<number, VerseInsights>>({})
  const [aiChapterLoading, setAiChapterLoading] = useState(false)
  const [aiChapterInsights, setAiChapterInsights] = useState<ChapterInsights | null>(null)
  const [aiBookLoading, setAiBookLoading] = useState(false)
  const [aiBookInsights, setAiBookInsights] = useState<BookInsights | null>(null)
  const [savingInsight, setSavingInsight] = useState<number | null>(null)
  const [versesResult, setVersesResult] = useState<VersesResult>({ requestKey: '', verses: [] })
  const [versesErrorKey, setVersesErrorKey] = useState('')
  const [version, setVersion] = useState('NVI')
  const [isVersionLoaded, setIsVersionLoaded] = useState(false)

  const bookIndex = livro ? LIVROS_BIBLIA.findIndex((candidate) => candidate.nome === livro.nome) : -1
  const versesRequestKey = livro && isVersionLoaded ? `${version}/${bookIndex}/${capitulo}` : ''
  const verses = versesResult.requestKey === versesRequestKey ? versesResult.verses : []
  const versesFailed = Boolean(versesRequestKey && versesErrorKey === versesRequestKey)
  const loadingVerses = !versesRequestKey || (!versesFailed && versesResult.requestKey !== versesRequestKey)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/configuracao?chave=bible_version', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('config-failed')))
      .then((data: { valor?: string } | null) => {
        if (data?.valor && BIBLE_VERSIONS.some(([key]) => key === data.valor)) setVersion(data.valor)
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Error loading Bible version', error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsVersionLoaded(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!versesRequestKey) return
    const controller = new AbortController()
    fetch(`/api/bible/${versesRequestKey}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('verses-failed')))
      .then((data: unknown) => {
        setVersesResult({ requestKey: versesRequestKey, verses: Array.isArray(data) ? data as BibleVerse[] : [] })
        setVersesErrorKey('')
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setVersesErrorKey(versesRequestKey)
      })
    return () => controller.abort()
  }, [versesRequestKey])

  const handleVersionChange = async (newVersion: string) => {
    if (newVersion === version) return
    setVersion(newVersion)
    setAiInsights({})
    setSelectedVerse(null)
    setAiChapterInsights(null)
    try {
      const response = await fetch('/api/configuracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'bible_version', valor: newVersion }),
      })
      if (!response.ok) throw new Error('version-save-failed')
    } catch {
      toast.error('A versão foi alterada nesta leitura, mas não pôde ser salva como preferência.')
    }
  }

  const handleChapterChange = (nextChapter: number) => {
    setSelectedVerse(null)
    setAiChapterInsights(null)
    setSearch('')
    if (nextChapter !== capitulo) setAiInsights({})
    setCapitulo(nextChapter)
  }

  const fetchInsights = async (verse: number, text: string) => {
    if (aiInsights[verse]) return
    setAiLoading(verse)
    try {
      const response = await fetch('/api/ai/bible-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseRef: `${livro?.nome} ${capitulo}:${verse}`, verseText: text }),
      })
      if (!response.ok) throw new Error('verse-insight-failed')
      const data: VerseInsights = await response.json()
      setAiInsights((current) => ({ ...current, [verse]: data }))
    } catch {
      toast.error('Não foi possível gerar a análise deste versículo.')
    } finally {
      setAiLoading(null)
    }
  }

  const fetchChapterInsights = async () => {
    if (aiChapterInsights || verses.length === 0) return
    setAiChapterLoading(true)
    try {
      const chapterText = verses.map((verse) => `${verse.verse}. ${verse.text}`).join(' ')
      const response = await fetch('/api/ai/bible-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterRef: `${livro?.nome} ${capitulo}`, chapterText }),
      })
      if (!response.ok) throw new Error('chapter-insight-failed')
      setAiChapterInsights(await response.json() as ChapterInsights)
    } catch {
      toast.error('Não foi possível gerar o estudo do capítulo.')
    } finally {
      setAiChapterLoading(false)
    }
  }

  const fetchBookInsights = async () => {
    if (aiBookInsights) return
    setAiBookLoading(true)
    try {
      const response = await fetch('/api/ai/bible-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookName: livro?.nome }),
      })
      if (!response.ok) throw new Error('book-insight-failed')
      setAiBookInsights(await response.json() as BookInsights)
    } catch {
      toast.error('Não foi possível gerar o estudo do livro.')
    } finally {
      setAiBookLoading(false)
    }
  }

  const saveInsight = async (verse: number, text: string) => {
    const insight = aiInsights[verse]
    if (!insight) return
    setSavingInsight(verse)
    try {
      const conteudo = `# Análise de ${livro?.nome} ${capitulo}:${verse}\n\n> ${text}\n\n## Exegese\n${insight.exegese}\n\n## Hermenêutica\n${insight.hermeneutica}\n\n## Aplicação\n${insight.aplicacao}`
      const response = await fetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: `Análise: ${livro?.nome} ${capitulo}:${verse}`,
          conteudo,
          livro: livro?.nome,
          capitulo,
          versiculo: verse,
          referencia: `${livro?.nome} ${capitulo}:${verse}`,
          tipo: 'estudo',
          tags: ['ia', 'exegese', livro?.nome],
        }),
      })
      if (!response.ok) throw new Error('save-insight-failed')
      toast.success('Análise salva nas suas anotações.')
    } catch {
      toast.error('Não foi possível salvar a análise.')
    } finally {
      setSavingInsight(null)
    }
  }

  if (!livro) {
    return (
      <WorkspacePage size="compact" archetype="reader">
        <EmptyState
          icon={LibraryBig}
          eyebrow="Livro não encontrado"
          title="Esta obra não faz parte do catálogo bíblico."
          description="Volte à biblioteca para escolher um dos 66 livros disponíveis."
          action={<Link href="/biblia" className={buttonStyles()}><ChevronLeft size={16} /> Voltar à Bíblia</Link>}
        />
      </WorkspacePage>
    )
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filteredVerses = normalizedSearch
    ? verses.filter((verse) => verse.text.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    : verses
  const chapters = Array.from({ length: livro.capitulos }, (_, index) => index + 1)
  const isOldTestament = livro.testamento === 'AT'

  return (
    <WorkspacePage size="full" archetype="reader">
      <DetailHeader
        variant="reader"
        index={`Códice ${String(bookIndex + 1).padStart(2, '0')} · ${version}`}
        backHref="/biblia"
        backLabel="Biblioteca bíblica"
        eyebrow={<><BookOpen size={13} /> {isOldTestament ? 'Antigo Testamento' : 'Novo Testamento'}</>}
        title={livro.nome}
        description={`${livro.categoria} · ${livro.capitulos} ${livro.capitulos === 1 ? 'capítulo' : 'capítulos'}. Leia primeiro; aprofunde quando desejar.`}
        icon={BookOpen}
        meta={<><Badge variant={isOldTestament ? 'warning' : 'default'}>{isOldTestament ? 'Antiga Aliança' : 'Nova Aliança'}</Badge><Badge variant="outline">Capítulo {capitulo}</Badge></>}
        actions={
          <label className="block w-full sm:w-72">
            <span className="sr-only">Versão bíblica</span>
            <select value={version} onChange={(event) => void handleVersionChange(event.target.value)} className="select-field">
              {BIBLE_VERSIONS.map(([key, name]) => <option key={key} value={key}>{key} · {name}</option>)}
            </select>
          </label>
        }
      />

      <div className="reading-dock toolbar-shell lg:sticky lg:top-3 lg:z-20">
        <div className="flex items-center justify-between rounded-xl border border-hairline bg-background/35 p-1">
          <Button type="button" variant="ghost" size="icon" disabled={capitulo === 1} onClick={() => handleChapterChange(capitulo - 1)} aria-label="Capítulo anterior">
            <ChevronLeft size={18} />
          </Button>
          <div className="min-w-32 px-3 text-center">
            <p className="eyebrow">Leitura atual</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">Capítulo {capitulo}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" disabled={capitulo === livro.capitulos} onClick={() => handleChapterChange(capitulo + 1)} aria-label="Próximo capítulo">
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <Input aria-label="Buscar neste capítulo" placeholder="Buscar palavra ou expressão neste capítulo…" value={search} onChange={(event) => setSearch(event.target.value)} icon={<Search size={16} />} />
        </div>
      </div>

      <div className="mb-5 lg:hidden">
        <details className="group rounded-2xl border border-hairline bg-surface shadow-soft">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-medium text-foreground">
            <ListFilter size={16} className="text-primary" /> Escolher capítulo
            <Badge variant="outline" className="ml-auto">{capitulo}</Badge>
            <ChevronDown size={16} className="text-subtle transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-hairline p-3"><ChapterGrid chapters={chapters} current={capitulo} onChange={handleChapterChange} /></div>
        </details>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="surface sticky top-24 p-4">
            <SectionHeading icon={ListFilter} title="Capítulos" description={`${livro.capitulos} disponíveis`} />
            <div className="max-h-[58dvh] overflow-y-auto pr-1 custom-scrollbar">
              <ChapterGrid chapters={chapters} current={capitulo} onChange={handleChapterChange} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <article className="reader-paper px-4 py-6 sm:px-8 sm:py-9 lg:px-12 lg:py-12" aria-labelledby="reading-title">
            <div className="relative mx-auto max-w-3xl">
              <div className="mb-8 flex items-end justify-between gap-4 border-b border-scripture/15 pb-5">
                <div>
                  <p className="eyebrow text-scripture">{version} · Texto bíblico</p>
                  <h2 id="reading-title" className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl">{livro.nome} {capitulo}</h2>
                </div>
                <Badge variant="outline">{verses.length} versículos</Badge>
              </div>

              {loadingVerses ? (
                <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Loader2 size={26} className="animate-spin text-scripture" />
                  <p className="text-sm">Abrindo o capítulo…</p>
                </div>
              ) : versesFailed ? (
                <EmptyState
                  icon={BookOpen}
                  compact
                  eyebrow="Leitura indisponível"
                  title="Não foi possível carregar este capítulo."
                  description="Tente mudar de capítulo e retornar ou recarregue a página."
                />
              ) : filteredVerses.length === 0 ? (
                <EmptyState
                  icon={Search}
                  compact
                  eyebrow="Nenhuma ocorrência"
                  title="Esta expressão não aparece no capítulo."
                  description="Tente outra palavra ou limpe o campo de busca."
                  action={<Button type="button" variant="outline" onClick={() => setSearch('')}>Limpar busca</Button>}
                />
              ) : (
                <div className="space-y-1">
                  {filteredVerses.map((verse) => {
                    const selected = selectedVerse === verse.verse
                    const insight = aiInsights[verse.verse]
                    return (
                      <div key={verse.verse}>
                        <button
                          type="button"
                          aria-expanded={selected}
                          aria-controls={`verse-${verse.verse}-study`}
                          onClick={() => setSelectedVerse(selected ? null : verse.verse)}
                          className={cn(
                            'group w-full rounded-xl px-3 py-2 text-left transition-colors sm:px-4 sm:py-3',
                            selected ? 'bg-scripture-soft ring-1 ring-scripture/15' : 'hover:bg-elevated/45',
                          )}
                        >
                          <span className="reading">
                            <span className="verse-number">{verse.verse}</span>
                            <span className={cn('transition-colors', selected ? 'text-foreground' : 'text-foreground/85 group-hover:text-foreground')}>{verse.text}</span>
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {selected && (
                            <motion.section
                              id={`verse-${verse.verse}-study`}
                              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                              className="overflow-hidden"
                              aria-label={`Ferramentas para ${livro.nome} ${capitulo}:${verse.verse}`}
                            >
                              <div className="my-4 rounded-2xl border border-primary/20 bg-elevated/90 p-4 shadow-inner sm:ml-8 sm:p-6">
                                {!insight ? (
                                  <div className="flex flex-col items-center py-5 text-center">
                                    <span className="icon-tile h-12 w-12 rounded-2xl"><BrainCircuit size={21} /></span>
                                    <h3 className="mt-4 text-lg font-semibold text-foreground">Estudar este versículo</h3>
                                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Gere exegese, hermenêutica, aplicação e caminhos homiléticos sob demanda.</p>
                                    <Button type="button" loading={aiLoading === verse.verse} onClick={() => fetchInsights(verse.verse, verse.text)} className="mt-5">
                                      <Sparkles size={16} /> Gerar análise
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-hairline pb-4">
                                      <span className="icon-tile h-10 w-10"><Sparkles size={17} /></span>
                                      <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">Análise contextual</p><p className="text-xs text-scripture">{livro.nome} {capitulo}:{verse.verse}</p></div>
                                      <Button type="button" variant="outline" size="sm" loading={savingInsight === verse.verse} onClick={() => saveInsight(verse.verse, verse.text)}><Save size={14} /> Salvar</Button>
                                      <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedVerse(null)} aria-label="Fechar análise" className="h-9 w-9"><X size={15} /></Button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      {VERSE_INSIGHT_SECTIONS.map(({ label, key }) => (
                                        <InsightCard key={key} label={label} content={insight[key]} />
                                      ))}
                                    </div>
                                    {insight.versiculosRelacionados?.length > 0 && (
                                      <div className="reader-paper mt-4 p-5"><div className="relative"><p className="eyebrow text-scripture">Referências cruzadas</p><div className="mt-3 flex flex-wrap gap-2">{insight.versiculosRelacionados.map((reference) => <Badge key={reference} variant="warning">{reference}</Badge>)}</div></div></div>
                                    )}
                                    {insight.comparacaoVersoes?.length > 0 && (
                                      <div className="mt-4 rounded-2xl border border-hairline bg-background/30 p-5">
                                        <p className="eyebrow flex items-center gap-2 text-primary-hover"><Languages size={14} /> Comparação de traduções</p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">{insight.comparacaoVersoes.map((comparison) => <div key={`${comparison.versao}-${comparison.texto}`} className="rounded-xl border border-hairline bg-surface p-4"><Badge variant="outline">{comparison.versao}</Badge><p className="mt-2 font-serif text-sm italic leading-6 text-muted-foreground">“{comparison.texto}”</p></div>)}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.section>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </article>

          <section className="mt-8 border-t border-hairline pt-8" aria-labelledby="study-lab-title">
            <SectionHeading
              icon={BrainCircuit}
              title={<span id="study-lab-title">Laboratório de estudo</span>}
              description="Depois da leitura, aprofunde o livro ou o capítulo com recursos gerados sob demanda."
              action={<Badge variant="default">Opcional · IA</Badge>}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <StudyTrigger
                icon={BookMarked}
                eyebrow="Panorama"
                title={`Conhecer o livro de ${livro.nome}`}
                description="Autoria, data, propósito, temas, cristocentrismo e estrutura."
                loading={aiBookLoading}
                ready={Boolean(aiBookInsights)}
                onClick={fetchBookInsights}
              />
              <StudyTrigger
                icon={BookOpen}
                eyebrow="Leitura próxima"
                title={`Estudar ${livro.nome} ${capitulo}`}
                description="Contexto, exegese, hermenêutica, tradições, aplicações e homilética."
                loading={aiChapterLoading}
                ready={Boolean(aiChapterInsights)}
                disabled={verses.length === 0}
                onClick={fetchChapterInsights}
              />
            </div>

            {aiBookInsights && (
              <section className="form-section form-section--accent mt-5" aria-labelledby="book-study-title">
                <div className="mb-6 flex items-start gap-3">
                  <span className="icon-tile"><BookMarked size={18} /></span>
                  <div className="min-w-0 flex-1"><p className="eyebrow text-primary-hover">Panorama do livro</p><h3 id="book-study-title" className="mt-1 text-xl font-semibold text-foreground">{livro.nome}</h3></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAiBookInsights(null)} aria-label="Fechar estudo do livro"><X size={16} /></Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {BOOK_INSIGHT_SECTIONS.map(({ label, key, scripture }) => <InsightCard key={key} label={label} content={aiBookInsights[key]} scripture={scripture} />)}
                </div>
              </section>
            )}

            {aiChapterInsights && (
              <section className="form-section form-section--accent mt-5" aria-labelledby="chapter-study-title">
                <div className="mb-6 flex items-start gap-3">
                  <span className="icon-tile"><BrainCircuit size={18} /></span>
                  <div className="min-w-0 flex-1"><p className="eyebrow text-primary-hover">Análise do capítulo</p><h3 id="chapter-study-title" className="mt-1 text-xl font-semibold text-foreground">{livro.nome} {capitulo}</h3></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAiChapterInsights(null)} aria-label="Fechar estudo do capítulo"><X size={16} /></Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {CHAPTER_INSIGHT_SECTIONS.map(({ label, key, scripture, wide }) => <InsightCard key={key} label={label} content={aiChapterInsights[key]} scripture={scripture} className={wide ? 'md:col-span-2 xl:col-span-3' : ''} />)}
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </WorkspacePage>
  )
}

function ChapterGrid({ chapters, current, onChange }: { chapters: number[]; current: number; onChange: (chapter: number) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
      {chapters.map((chapter) => (
        <button
          key={chapter}
          type="button"
          aria-current={chapter === current ? 'true' : undefined}
          onClick={() => onChange(chapter)}
          className={cn(
            'flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
            chapter === current
              ? 'border-primary/40 bg-primary text-primary-foreground shadow-glow'
              : 'border-transparent bg-elevated/45 text-subtle hover:border-hairline-strong hover:text-foreground',
          )}
        >
          {chapter}
        </button>
      ))}
    </div>
  )
}

function StudyTrigger({
  icon: Icon,
  eyebrow,
  title,
  description,
  loading,
  ready,
  disabled,
  onClick,
}: {
  icon: typeof BookOpen
  eyebrow: string
  title: string
  description: string
  loading: boolean
  ready: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="top-sheen group flex min-h-44 items-start gap-4 rounded-2xl border border-hairline bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-elevated disabled:opacity-50 sm:p-6"
    >
      <span className="icon-tile h-11 w-11 rounded-2xl">{loading ? <Loader2 size={18} className="animate-spin" /> : ready ? <Check size={18} /> : <Icon size={18} />}</span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow text-primary-hover">{eyebrow}</span>
        <span className="mt-2 block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
        <span className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">{ready ? 'Estudo disponível abaixo' : loading ? 'Construindo estudo…' : 'Gerar agora'} {!ready && !loading && <ChevronRight size={13} />}</span>
      </span>
    </button>
  )
}

function InsightCard({ label, content, scripture = false, className }: { label: string; content: string; scripture?: boolean; className?: string }) {
  return (
    <article className={cn('rounded-2xl border p-5', scripture ? 'border-scripture/20 bg-scripture-soft' : 'border-hairline bg-background/30', className)}>
      <p className={cn('eyebrow', scripture ? 'text-scripture' : 'text-primary-hover')}>{label}</p>
      <div className="prose mt-3 max-w-none text-sm"><ReactMarkdown>{content}</ReactMarkdown></div>
    </article>
  )
}
