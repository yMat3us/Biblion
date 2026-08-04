'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Markdown } from '@/components/ui/Markdown'
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
import { Modal } from '@/components/ui/Modal'
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
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  // Controla se a página isolada de análise de capítulo/livro está aberta
  const [isolatedAnalysis, setIsolatedAnalysis] = useState<'livro' | 'capitulo' | number | null>(null)

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
    if (aiInsights[verse]) {
      setIsolatedAnalysis(verse)
      return
    }
    setAiLoading(verse)
    setIsolatedAnalysis(verse)
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
      setIsolatedAnalysis(null)
    } finally {
      setAiLoading(null)
    }
  }

  const fetchChapterInsights = async () => {
    if (aiChapterInsights) {
      setIsolatedAnalysis('capitulo')
      return
    }
    if (verses.length === 0) return
    setAiChapterLoading(true)
    setIsolatedAnalysis('capitulo')
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
      setIsolatedAnalysis(null)
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
      if (!aiBookInsights) setIsolatedAnalysis('livro')
    }
  }

  // Hooking the state so it opens when ready if it was triggered
  useEffect(() => {
    if (aiChapterInsights) setIsolatedAnalysis('capitulo')
  }, [aiChapterInsights])

  useEffect(() => {
    if (aiBookInsights) setIsolatedAnalysis('livro')
  }, [aiBookInsights])

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

  if (isolatedAnalysis !== null) {
    const isBook = isolatedAnalysis === 'livro'
    const isChapter = isolatedAnalysis === 'capitulo'
    const isVerse = typeof isolatedAnalysis === 'number'

    let insights: any = null
    let title = ''
    let sections: any[] = []
    let eyebrow = ''

    if (isBook) {
      insights = aiBookInsights
      title = livro.nome
      sections = BOOK_INSIGHT_SECTIONS
      eyebrow = 'Visão Panorâmica'
    } else if (isChapter) {
      insights = aiChapterInsights
      title = `${livro.nome} ${capitulo}`
      sections = CHAPTER_INSIGHT_SECTIONS
      eyebrow = 'Lente Exegética'
    } else if (isVerse) {
      insights = aiInsights[isolatedAnalysis]
      title = `${livro.nome} ${capitulo}:${isolatedAnalysis}`
      sections = VERSE_INSIGHT_SECTIONS
      eyebrow = 'Análise do Versículo'
    }

    if (!insights) {
      return (
        <WorkspacePage size="full" archetype="reader">
          <div className="flex h-[80vh] flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-scripture mb-4" />
            <p className="text-muted-foreground">Gerando análise teológica de {title}...</p>
          </div>
        </WorkspacePage>
      )
    }

    return (
      <WorkspacePage size="full" archetype="reader">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <button 
            type="button" 
            onClick={() => setIsolatedAnalysis(null)} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft size={16} /> Voltar para leitura
          </button>
          
          <div className="mb-10 border-b border-hairline pb-8">
            <p className="eyebrow text-scripture mb-3">{eyebrow}</p>
            <h1 className="text-3xl font-serif font-bold text-foreground sm:text-5xl">{title}</h1>
            {isVerse && verses.find(v => v.verse === isolatedAnalysis) && (
              <p className="mt-4 text-xl font-serif italic text-muted-foreground border-l-4 border-scripture/30 pl-4">
                "{verses.find(v => v.verse === isolatedAnalysis)?.text}"
              </p>
            )}
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
              Análise aprofundada gerada por inteligência artificial para auxiliar no seu estudo e pregação.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((sec: any, i: number) => {
              const content = insights[sec.key]
              if (!content) return null
              const colorClasses = [
                'border-blue-500/20 bg-blue-500/5',
                'border-emerald-500/20 bg-emerald-500/5',
                'border-amber-500/20 bg-amber-500/5',
                'border-purple-500/20 bg-purple-500/5',
                'border-rose-500/20 bg-rose-500/5',
                'border-indigo-500/20 bg-indigo-500/5',
              ]
              const colorClass = colorClasses[i % colorClasses.length]
              
              return (
                <div key={sec.key} className={cn("rounded-2xl border p-6 sm:p-8", colorClass, sec.wide ? "md:col-span-2" : "")}>
                  <h3 className="font-semibold text-foreground mb-4 text-lg border-b border-hairline pb-2">{sec.label}</h3>
                  <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground prose-strong:text-foreground prose-strong:font-bold prose-headings:text-foreground">
                    <Markdown>{insights[sec.key] || ''}</Markdown>
                  </div>
                </div>
              )
            })}
          </div>

          {isVerse && insights.versiculosRelacionados?.length > 0 && (
            <div className="mt-8 rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
              <h3 className="font-semibold text-foreground mb-4 text-lg border-b border-hairline pb-2">Referências cruzadas</h3>
              <div className="flex flex-wrap gap-2">
                {insights.versiculosRelacionados.map((ref: string) => <Badge key={ref} variant="warning">{ref}</Badge>)}
              </div>
            </div>
          )}

          {isVerse && insights.comparacaoVersoes?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
              <h3 className="font-semibold text-foreground mb-4 text-lg border-b border-hairline pb-2 flex items-center gap-2">
                <Languages size={18} /> Comparação de traduções
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.comparacaoVersoes.map((comp: any) => (
                  <div key={comp.versao} className="rounded-xl border border-hairline bg-elevated/40 p-4">
                    <Badge variant="outline" className="mb-2">{comp.versao}</Badge>
                    <p className="font-serif text-sm italic leading-relaxed text-muted-foreground">"{comp.texto}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WorkspacePage>
    )
  }

  if (isReadingMode) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground selection:bg-scripture-soft selection:text-scripture">
        <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent pointer-events-none">
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsReadingMode(false)} className="pointer-events-auto bg-background/50 backdrop-blur-md border border-hairline">
            <ChevronLeft size={16} /> Sair do modo de leitura
          </Button>
          <div className="pointer-events-auto flex items-center gap-2 bg-background/50 backdrop-blur-md rounded-xl border border-hairline p-1 shadow-sm">
            <Button type="button" variant="ghost" size="icon" disabled={capitulo === 1} onClick={() => handleChapterChange(capitulo - 1)}><ChevronLeft size={16} /></Button>
            <span className="text-sm font-semibold px-2">{livro.nome} {capitulo}</span>
            <Button type="button" variant="ghost" size="icon" disabled={capitulo === livro.capitulos} onClick={() => handleChapterChange(capitulo + 1)}><ChevronRight size={16} /></Button>
          </div>
        </div>

        <article className="max-w-2xl mx-auto px-6 py-24 sm:py-32 font-serif text-lg leading-loose">
          <h2 className="text-3xl sm:text-5xl font-bold mb-12 text-center text-foreground">{livro.nome} {capitulo}</h2>
          <div className="space-y-6">
            {verses.map((verse) => (
              <p key={verse.verse}>
                <sup className="text-scripture font-sans font-semibold mr-2 opacity-60 text-xs">{verse.verse}</sup>
                <span className="text-foreground/90">{verse.text}</span>
              </p>
            ))}
          </div>
        </article>
      </div>
    )
  }

  return (
    <WorkspacePage size="full" archetype="reader">
      <DetailHeader
        variant="reader"
        index={`Códice ${String(bookIndex + 1).padStart(2, '0')} · ${version}`}
        backHref="/biblia"
        backLabel="Biblioteca bíblica"
        eyebrow={<><BookOpen size={13} /> {isOldTestament ? 'Antigo Testamento' : 'Novo Testamento'}</>}
        title={livro.nome}
        description={`${livro.categoria} · ${livro.capitulos} ${livro.capitulos === 1 ? 'capítulo' : 'capítulos'}. Mergulhe nas Escrituras e descubra as verdades eternas reservadas para você hoje.`}
        icon={BookOpen}
        meta={<><Badge variant={isOldTestament ? 'warning' : 'default'}>{isOldTestament ? 'Antiga Aliança' : 'Nova Aliança'}</Badge><Badge variant="outline">Capítulo {capitulo}</Badge></>}
        actions={
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto text-scripture border-scripture/20 hover:border-scripture/50" onClick={() => setIsReadingMode(true)}>
              Modo Leitura
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsVersionModalOpen(true)}>
              <Languages size={14} className="mr-2 opacity-50" />
              {version}
              <ChevronDown size={14} className="ml-2 opacity-50" />
            </Button>
          </div>
        }
      />
      
      <Modal isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} title="Tradução da Bíblia" description="Escolha a versão que você prefere para sua leitura.">
        <div className="grid gap-2">
          {BIBLE_VERSIONS.map(([key, name]) => (
            <button
              key={key}
              type="button"
              onClick={() => { handleVersionChange(key); setIsVersionModalOpen(false) }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border text-left transition-all",
                version === key ? "border-scripture bg-scripture-soft text-scripture" : "border-hairline bg-surface hover:bg-elevated text-foreground"
              )}
            >
              <div>
                <span className="font-semibold block">{key}</span>
                <span className="text-sm opacity-80">{name}</span>
              </div>
              {version === key && <Check size={18} />}
            </button>
          ))}
        </div>
      </Modal>

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
                  <p className="eyebrow text-scripture">{version} · Palavra de Deus</p>
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
                          onClick={() => fetchInsights(verse.verse, verse.text)}
                          className={cn(
                            'group w-full rounded-xl px-3 py-2 text-left transition-colors sm:px-4 sm:py-3 hover:bg-elevated/45',
                          )}
                        >
                          <span className="reading relative pr-8 block">
                            <span className="verse-number">{verse.verse}</span>
                            <span className="text-foreground/85 group-hover:text-foreground transition-colors">{verse.text}</span>
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-scripture-soft text-scripture rounded-full p-1.5 shadow-sm">
                              <Sparkles size={14} />
                            </span>
                          </span>
                        </button>
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
              title={<span id="study-lab-title">Aprofundamento Teológico</span>}
              description="Vá além da superfície: obtenha clareza, contexto histórico e inspiração através de ferramentas exegéticas guiadas pelo Espírito."
              action={<Badge variant="default">Opcional · IA</Badge>}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <StudyTrigger
                icon={BookMarked}
                eyebrow="Visão Panorâmica"
                title={`O propósito de ${livro.nome}`}
                description="Compreenda a autoria, contexto histórico e como Cristo é revelado em cada página."
                loading={aiBookLoading}
                ready={Boolean(aiBookInsights)}
                onClick={fetchBookInsights}
              />
              <StudyTrigger
                icon={BookOpen}
                eyebrow="Lente Exegética"
                title={`Riquezas de ${livro.nome} ${capitulo}`}
                description="Mergulhe fundo no texto com exegese original, tradição cristã e insights práticos."
                loading={aiChapterLoading}
                ready={Boolean(aiChapterInsights)}
                disabled={verses.length === 0}
                onClick={fetchChapterInsights}
              />
            </div>

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
      <div className="prose mt-3 max-w-none text-sm"><Markdown>{content}</Markdown></div>
    </article>
  )
}
