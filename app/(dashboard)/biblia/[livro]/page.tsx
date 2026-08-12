'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Markdown } from '@/components/ui/Markdown'
import {
  BookMarked,
  BookOpen,
  BookText,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cross,
  FileText,
  Landmark,
  Languages,
  LibraryBig,
  Link2,
  ListFilter,
  Loader2,
  Microscope,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react'
import { getLivro, LIVROS_BIBLIA } from '@/data/livros'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Feedback'
import { WordAnalysis } from '@/components/ui/WordAnalysis'
import { StudySection } from '@/components/ui/StudySection'
import { CrossReferences } from '@/components/ui/CrossReferences'
import { VersionComparison } from '@/components/ui/VersionComparison'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAnalysisProgress } from '@/components/analysis/AnalysisProgressProvider'
import { cn } from '@/lib/utils'
import type { VerseAnalysisResult, VersionComparisonEntry } from '@/lib/ai-audit-types'

interface BibleVerse {
  verse: number
  text: string
}

interface VerseProgressState {
  progress: number
  statusMessage: string
  waitingRateLimit: boolean
  currentModule?: number | null
  totalModules?: number | null
  status: 'generating' | 'error'
}

interface VersionComparison {
  versao: string
  texto: string
}

interface VerseInsights {
  textoVersiculo: string;
  comparacaoVersoes: string;
  contextoImediato: string;
  sentidoPrincipal: string;
  exegeseDetalhada: string;
  textoOriginal: string;
  analiseLexical: string;
  gramaticaMorfologia: string;
  sintaxe: string;
  variantesTextuais: string;
  traduzLiteral: string;
  palavrasChave: string;
  referenciasCruzadas: string;
  intertextualidade: string;
  contextoHistorico: string;
  figurasLinguagem: string;
  dificuldades: string;
  interpretacoesPrincipais: string;
  avaliacaoExegetica: string;
  implicacoesTeologicas: string;
  relacaoCristo: string;
  usoHistoriaIgreja: string;
  errosComuns: string;
  aplicacao: string;
  resumoExegetico: string;
}

interface ChapterInsights {
  visaoGeral: string;
  contextoImediato: string;
  estrutura: string;
  fluxoArgumentativo: string;
  analiseSecoes: string;
  temasPrincipais: string;
  teologiaCapitulo: string;
  conexoesBiblicas: string;
  pontosTensao: string;
  principaisInterpretacoes: string;
  mensagemCentral: string;
  aplicacoes: string;
}

interface BookInsights {
  visaoGeral: string;
  autoria: string;
  dataELocal: string;
  destinatarios: string;
  contextoHistorico: string;
  contextoCultural: string;
  contextoGeografico: string;
  ocasiao: string;
  proposito: string;
  generoLiterario: string;
  estrutura: string;
  fluxoLiterario: string;
  temaCentral: string;
  temasPrincipais: string;
  teologia: string;
  cristologia: string;
  lugarHistoriaRedencao: string;
  relacaoOutrosLivros: string;
  usoAntigoTestamento: string;
  palavrasConceitos: string;
  personagensPrincipais: string;
  cronologia: string;
  principaisLugares: string;
  questoesInterpretativas: string;
  debatesTeologicos: string;
  historiaInterpretacao: string;
  canonicidade: string;
  manuscritos: string;
  contribuicaoUnica: string;
  conclusaoTeologica: string;
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

const BOOK_INSIGHT_SECTIONS: Array<{ label: string; key: keyof BookInsights; scripture?: boolean; wide?: boolean }> = [
  { label: 'Visão geral', key: 'visaoGeral', wide: true },
  { label: 'Autoria', key: 'autoria' },
  { label: 'Data e local', key: 'dataELocal' },
  { label: 'Destinatários', key: 'destinatarios' },
  { label: 'Contexto histórico', key: 'contextoHistorico' },
  { label: 'Contexto cultural', key: 'contextoCultural' },
  { label: 'Contexto geográfico', key: 'contextoGeografico' },
  { label: 'Ocasião da escrita', key: 'ocasiao' },
  { label: 'Propósito', key: 'proposito' },
  { label: 'Gênero literário', key: 'generoLiterario' },
  { label: 'Estrutura', key: 'estrutura', wide: true },
  { label: 'Fluxo literário', key: 'fluxoLiterario' },
  { label: 'Tema central', key: 'temaCentral' },
  { label: 'Temas principais', key: 'temasPrincipais' },
  { label: 'Teologia', key: 'teologia' },
  { label: 'Cristologia', key: 'cristologia' },
  { label: 'Lugar na história da redenção', key: 'lugarHistoriaRedencao' },
  { label: 'Relação com outros livros', key: 'relacaoOutrosLivros' },
  { label: 'Uso do AT', key: 'usoAntigoTestamento' },
  { label: 'Palavras e conceitos', key: 'palavrasConceitos' },
  { label: 'Personagens principais', key: 'personagensPrincipais' },
  { label: 'Cronologia', key: 'cronologia' },
  { label: 'Principais lugares', key: 'principaisLugares' },
  { label: 'Questões interpretativas', key: 'questoesInterpretativas' },
  { label: 'Debates teológicos', key: 'debatesTeologicos' },
  { label: 'História da interpretação', key: 'historiaInterpretacao' },
  { label: 'Canonicidade', key: 'canonicidade' },
  { label: 'Manuscritos', key: 'manuscritos' },
  { label: 'Contribuição única', key: 'contribuicaoUnica' },
  { label: 'Conclusão teológica', key: 'conclusaoTeologica', wide: true },
]

const CHAPTER_INSIGHT_SECTIONS: Array<{ label: string; key: keyof ChapterInsights; scripture?: boolean; wide?: boolean }> = [
  { label: 'Visão geral', key: 'visaoGeral', wide: true },
  { label: 'Contexto imediato', key: 'contextoImediato' },
  { label: 'Estrutura', key: 'estrutura' },
  { label: 'Fluxo argumentativo', key: 'fluxoArgumentativo' },
  { label: 'Análise das seções', key: 'analiseSecoes' },
  { label: 'Temas principais', key: 'temasPrincipais' },
  { label: 'Teologia do capítulo', key: 'teologiaCapitulo' },
  { label: 'Conexões bíblicas', key: 'conexoesBiblicas' },
  { label: 'Pontos de tensão', key: 'pontosTensao' },
  { label: 'Principais interpretações', key: 'principaisInterpretacoes' },
  { label: 'Mensagem central', key: 'mensagemCentral', wide: true },
  { label: 'Aplicações', key: 'aplicacoes', wide: true },
]

export default function LivroPage() {
  const toast = useToast()
  const params = useParams<{ livro: string }>()
  const livroNome = decodeURIComponent(params.livro)
  const [activeMenuVerse, setActiveMenuVerse] = useState<number | null>(null)
  const livro = getLivro(livroNome)
  const [capitulo, setCapitulo] = useState(1)
  const [search, setSearch] = useState('')
  const [, setSelectedVerse] = useState<number | null>(null)
  const [, setAiLoading] = useState<number | null>(null)
  const [, setAiInsights] = useState<Record<number, VerseInsights>>({})
  const [aiChapterLoading, setAiChapterLoading] = useState(false)
  const [aiChapterInsights, setAiChapterInsights] = useState<ChapterInsights | null>(null)
  const [aiBookLoading, setAiBookLoading] = useState(false)
  const [aiBookInsights, setAiBookInsights] = useState<BookInsights | null>(null)
  const [versesResult, setVersesResult] = useState<VersesResult>({ requestKey: '', verses: [] })
  const [versesErrorKey, setVersesErrorKey] = useState('')
  const [version, setVersion] = useState('NVI')
  const [isVersionLoaded, setIsVersionLoaded] = useState(false)
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  // Nova análise de versículo
  const [verseAnalysis, setVerseAnalysis] = useState<Record<number, VerseAnalysisResult>>({})
  const [versionComparisons, setVersionComparisons] = useState<VersionComparisonEntry[]>([])
  // Progresso ao vivo por versículo (para a barra inline enquanto a tela está aberta).
  const [verseProgress, setVerseProgress] = useState<Record<number, VerseProgressState>>({})
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // track(): registra a geração no rastreador global (dock flutuante + notificações
  // + continuidade em segundo plano quando o usuário sai desta página).
  const { track } = useAnalysisProgress()

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
    if (nextChapter !== capitulo) {
      setAiInsights({})
      setVerseAnalysis({})
    }
    setCapitulo(nextChapter)
  }

  // Buscar comparação de versões reais (o React Compiler memoiza esta função).
  const fetchVersionComparison = async (verseNumber: number) => {
    try {
      const response = await fetch(`/api/bible/compare?bookIndex=${bookIndex}&chapter=${capitulo}&verse=${verseNumber}`)
      if (response.ok) {
        setVersionComparisons(await response.json() as VersionComparisonEntry[])
      }
    } catch {
      // Comparação é não-bloqueante
    }
  }

  // Limpa o polling da tela ao desmontar (a geração continua no servidor e é
  // acompanhada pelo rastreador global).
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const fetchVerseAnalysis = async (verse: number, text: string) => {
    // Se já tem a análise completa, exibe direto
    if (verseAnalysis[verse] && (verseAnalysis[verse].auditStatus === 'APPROVED' || verseAnalysis[verse].auditStatus === 'NEEDS_REVIEW')) {
      setIsolatedAnalysis(verse)
      fetchVersionComparison(verse)
      return
    }
    setAiLoading(verse)
    setIsolatedAnalysis(verse)
    setVersionComparisons([])
    setVerseProgress((current) => ({
      ...current,
      [verse]: { progress: 0, statusMessage: 'Iniciando análise…', waitingRateLimit: false, status: 'generating' },
    }))
    const verseRef = `${livro?.nome} ${capitulo}:${verse}`
    try {
      const response = await fetch('/api/ai/verse-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseRef, verseText: text }),
      })
      if (!response.ok) throw new Error('verse-analysis-failed')
      const data = await response.json()

      // Se já está completo (veio do cache)
      if (data.auditStatus === 'APPROVED' || data.auditStatus === 'NEEDS_REVIEW') {
        setVerseAnalysis((current) => ({ ...current, [verse]: data as VerseAnalysisResult }))
        setAiLoading(null)
        fetchVersionComparison(verse)
        return
      }

      // Está gerando. Registra no rastreador global (dock + notificações +
      // segundo plano) e faz um polling local para alimentar a barra inline.
      if (data.docId && (data.status === 'GENERATING' || data.auditStatus === 'GENERATING')) {
        const docId = data.docId as string
        track({
          docId,
          verseRef,
          href: livro ? `/biblia/${encodeURIComponent(livro.nome)}` : '/biblia',
        })

        // Semeia a barra com o progresso atual (relevante ao reabrir uma análise
        // que já estava em andamento).
        setVerseProgress((current) => ({
          ...current,
          [verse]: {
            progress: typeof data.progress === 'number' ? data.progress : 0,
            statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : 'Iniciando análise…',
            waitingRateLimit: Boolean(data.waitingRateLimit),
            currentModule: data.currentModule ?? null,
            totalModules: data.totalModules ?? null,
            status: 'generating',
          },
        }))

        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = setInterval(async () => {
          try {
            const pollResponse = await fetch(`/api/ai/verse-analysis?docId=${encodeURIComponent(docId)}`)
            if (!pollResponse.ok) return
            const pollData = await pollResponse.json()

            if (pollData.auditStatus === 'APPROVED' || pollData.auditStatus === 'NEEDS_REVIEW') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              pollingRef.current = null
              setVerseAnalysis((current) => ({ ...current, [verse]: pollData as VerseAnalysisResult }))
              setVerseProgress((current) => {
                const next = { ...current }
                delete next[verse]
                return next
              })
              setAiLoading(null)
              fetchVersionComparison(verse)
            } else if (pollData.auditStatus === 'ERROR' || pollData.status === 'ERROR') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              pollingRef.current = null
              setVerseProgress((current) => ({
                ...current,
                [verse]: { ...current[verse], progress: current[verse]?.progress ?? 0, statusMessage: 'Erro ao gerar a análise', waitingRateLimit: false, status: 'error' },
              }))
              setAiLoading(null)
            } else {
              // Ainda gerando: atualiza a barra com o progresso reportado pelo pipeline.
              setVerseProgress((current) => ({
                ...current,
                [verse]: {
                  progress: typeof pollData.progress === 'number' ? pollData.progress : current[verse]?.progress ?? 0,
                  statusMessage: pollData.statusMessage ?? current[verse]?.statusMessage ?? 'Processando…',
                  waitingRateLimit: Boolean(pollData.waitingRateLimit),
                  currentModule: pollData.currentModule ?? null,
                  totalModules: pollData.totalModules ?? null,
                  status: 'generating',
                },
              }))
            }
          } catch {
            // Erro de polling — continua tentando na próxima iteração.
          }
        }, 4000)
      }
    } catch {
      toast.error('Não foi possível gerar a análise deste versículo.')
      setIsolatedAnalysis(null)
      setAiLoading(null)
      setVerseProgress((current) => {
        const next = { ...current }
        delete next[verse]
        return next
      })
    }
  }

  // Manter compatibilidade: fetchInsights antigo redireciona para o novo
  const fetchInsights = fetchVerseAnalysis

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
    if (aiBookInsights) {
      setIsolatedAnalysis('livro')
      return
    }
    setAiBookLoading(true)
    setIsolatedAnalysis('livro')
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
      setIsolatedAnalysis(null)
    } finally {
      setAiBookLoading(false)
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

    // ─── NOVA ANÁLISE DE VERSÍCULO ───────────────────────────────────
    if (isVerse) {
      const analysis = verseAnalysis[isolatedAnalysis]
      const verseTitle = `${livro.nome} ${capitulo}:${isolatedAnalysis}`

      if (!analysis) {
        const progress = verseProgress[isolatedAnalysis]
        const pct = progress?.progress ?? 0
        const waiting = progress?.waitingRateLimit ?? false
        const statusMessage = progress?.statusMessage ?? 'Iniciando análise…'
        const isError = progress?.status === 'error'
        return (
          <WorkspacePage size="full" archetype="reader">
            <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
              <button
                type="button"
                onClick={() => setIsolatedAnalysis(null)}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft size={16} /> Voltar (a análise continua em segundo plano)
              </button>

              <div className="flex flex-col items-center gap-2">
                <span className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl',
                  isError ? 'bg-destructive/10 text-destructive' : waiting ? 'bg-amber-500/10 text-amber-500' : 'bg-primary-soft text-primary',
                )}>
                  {isError ? <ShieldAlert size={26} /> : waiting ? <Clock size={26} /> : <Loader2 size={26} className="animate-spin" />}
                </span>
                <h1 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">{verseTitle}</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  {isError
                    ? 'Não foi possível concluir a análise. Toque no versículo novamente para tentar de novo.'
                    : 'Gerando análise teológica avançada com auditoria em múltiplas camadas.'}
                </p>
              </div>

              {!isError && (
                <div className="w-full">
                  <ProgressBar value={pct} indeterminate={waiting} showValue={!waiting} />
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                    {waiting && <Clock size={14} className="shrink-0 text-amber-500" />}
                    <span className={cn('leading-snug', waiting ? 'text-amber-500' : 'text-muted-foreground')}>{statusMessage}</span>
                  </div>
                  {!waiting && progress?.currentModule && progress?.totalModules ? (
                    <p className="mt-1 text-xs text-subtle">Módulo {progress.currentModule} de {progress.totalModules}</p>
                  ) : null}
                </div>
              )}

              <p className="max-w-md text-xs text-subtle">
                Você pode fechar esta tela ou navegar pelo aplicativo — o processo segue em segundo plano e avisaremos por notificação quando terminar.
              </p>
            </div>
          </WorkspacePage>
        )
      }

      return (
        <WorkspacePage size="full" archetype="reader">
          <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
            {/* Botão voltar */}
            <button
              type="button"
              onClick={() => { setIsolatedAnalysis(null); setVersionComparisons([]) }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ChevronLeft size={16} /> Voltar para leitura
            </button>

            {/* Cabeçalho */}
            <div className="mb-10 border-b border-hairline pb-8">
              <div className="flex items-center gap-3 mb-3">
                <p className="eyebrow text-scripture">Análise do Versículo</p>
                {analysis.auditStatus === 'APPROVED' ? (
                  <Badge variant="default" className="gap-1 text-success border-success/30 bg-success/10"><ShieldCheck size={12} /> Aprovado</Badge>
                ) : (
                  <Badge variant="warning" className="gap-1"><ShieldAlert size={12} /> Revisão</Badge>
                )}
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground sm:text-5xl">{verseTitle}</h1>
              {verses.find(v => v.verse === isolatedAnalysis) && (
                <p className="mt-4 text-xl font-serif italic text-muted-foreground border-l-4 border-scripture/30 pl-4">
                  &quot;{verses.find(v => v.verse === isolatedAnalysis)?.text}&quot;
                </p>
              )}
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
                Análise aprofundada gerada por inteligência artificial com auditoria teológica em múltiplas camadas.
              </p>
            </div>

            {/* ── SEÇÃO 1: Análise Palavra-por-Palavra ── */}
            {analysis.wordAnalysis && analysis.wordAnalysis.length > 0 && (
              <section className="mb-12">
                <SectionHeading
                  icon={Languages}
                  title="Análise Palavra-por-Palavra"
                  description={`${analysis.wordAnalysis.length} palavras no texto original (${analysis.testament === 'AT' ? 'Hebraico/Aramaico' : 'Grego'})`}
                />
                <div className="surface rounded-2xl p-6 sm:p-8 mt-4">
                  <WordAnalysis words={analysis.wordAnalysis} testament={analysis.testament} />
                </div>
              </section>
            )}

            {/* ── SEÇÃO 2: Estudo Aprofundado (5 seções) ── */}
            <section className="mb-12">
              <SectionHeading
                icon={BrainCircuit}
                title="Estudo Aprofundado"
                description="Exegese, Hermenêutica, Contexto Histórico-Cultural, Contexto Literário e Teologia"
              />
              <div className="mt-4 space-y-3">
                {analysis.exegese && (
                  <StudySection
                    title="Exegese"
                    icon={BookText}
                    content={analysis.exegese}
                    isExtensive
                    accentColor="border-blue-500"
                    defaultOpen
                  />
                )}
                {analysis.hermeneutica && (
                  <StudySection
                    title="Hermenêutica"
                    icon={Microscope}
                    content={analysis.hermeneutica}
                    isExtensive
                    accentColor="border-emerald-500"
                  />
                )}
                {analysis.contextoHistoricoCultural && (
                  <StudySection
                    title="Contexto Histórico-Cultural"
                    icon={Landmark}
                    content={analysis.contextoHistoricoCultural}
                    accentColor="border-amber-500"
                  />
                )}
                {analysis.contextoLiterario && (
                  <StudySection
                    title="Contexto Literário"
                    icon={FileText}
                    content={analysis.contextoLiterario}
                    accentColor="border-purple-500"
                  />
                )}
                {analysis.teologia && (
                  <StudySection
                    title="Teologia"
                    icon={Cross}
                    content={analysis.teologia}
                    accentColor="border-rose-500"
                  />
                )}
              </div>
            </section>

            {/* ── SEÇÃO 3: Referências Cruzadas ── */}
            {analysis.referenciasCruzadas && analysis.referenciasCruzadas.length > 0 && (
              <section className="mb-12">
                <SectionHeading
                  icon={Link2}
                  title="Referências Cruzadas"
                  description={`${analysis.referenciasCruzadas.length} referências encontradas`}
                />
                <div className="surface rounded-2xl p-6 sm:p-8 mt-4">
                  <CrossReferences references={analysis.referenciasCruzadas} />
                </div>
              </section>
            )}

            {/* ── SEÇÃO 4: Comparação de Versões ── */}
            {versionComparisons.length > 0 && (
              <section className="mb-12">
                <SectionHeading
                  icon={Languages}
                  title="Comparação de Versões"
                  description={`${versionComparisons.length} traduções comparadas · Dados reais (não gerados por IA)`}
                />
                <div className="mt-4">
                  <VersionComparison comparisons={versionComparisons} testament={analysis.testament} />
                </div>
              </section>
            )}
          </div>
        </WorkspacePage>
      )
    }

    // ─── ANÁLISE DE CAPÍTULO / LIVRO (preservada) ────────────────────
    let insights: ChapterInsights | BookInsights | null = null
    let title = ''
    let sections: { label: string; key: keyof ChapterInsights | keyof BookInsights; wide?: boolean }[] = []
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
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
              Análise aprofundada gerada por inteligência artificial para auxiliar no seu estudo e pregação.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((sec, i: number) => {
              const content = (insights as unknown as Record<string, string>)?.[sec.key as string]
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
                <div key={sec.key as string} className={cn("rounded-2xl border p-6 sm:p-8", colorClass, sec.wide ? "md:col-span-2" : "")}>
                  <h3 className="font-semibold text-foreground mb-4 text-lg border-b border-hairline pb-2">{sec.label}</h3>
                  <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground prose-strong:text-foreground prose-strong:font-bold prose-headings:text-foreground">
                    <Markdown>{content || ''}</Markdown>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </WorkspacePage>
    )
  }

  if (isReadingMode) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground selection:bg-scripture-soft selection:text-scripture">
        <div className="fixed top-0 inset-x-0 z-[101] flex items-center justify-between p-4 bg-gradient-to-b from-background to-transparent pointer-events-none">
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
      />

      <div className="flex w-full items-center justify-start gap-3 mb-8">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none sm:w-48 h-12 text-scripture border-scripture/20 hover:border-scripture/50" onClick={() => setIsReadingMode(true)}>
          Modo Leitura
        </Button>
        <Button type="button" variant="outline" className="flex-1 sm:flex-none sm:w-48 h-12" onClick={() => setIsVersionModalOpen(true)}>
          <Languages size={14} className="mr-2 opacity-50 shrink-0" />
          <span className="truncate">{version}</span>
          <ChevronDown size={14} className="ml-2 opacity-50 shrink-0" />
        </Button>
      </div>
      
      <Modal size="md" position="top" isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} title="Tradução da Bíblia" description="Escolha a versão que você prefere para sua leitura.">
        <div className="grid gap-2 max-h-[40vh] overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
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
                    return (
                      <div key={verse.verse} className="group flex items-start gap-2 rounded-xl px-3 py-2 transition-colors sm:px-4 sm:py-3 hover:bg-elevated/45 relative">
                        <div className="reading flex-1 pt-1">
                          <span className="verse-number">{verse.verse}</span>
                          <span className="text-foreground/85 group-hover:text-foreground transition-colors">{verse.text}</span>
                        </div>
                        <div className="relative shrink-0 flex flex-col items-end">
                          <button
                            type="button"
                            onClick={() => setActiveMenuVerse(activeMenuVerse === verse.verse ? null : verse.verse)}
                            className="flex items-center justify-center h-8 w-8 rounded-md border border-hairline bg-transparent hover:bg-elevated text-subtle transition-colors"
                            aria-label="Opções do versículo"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {activeMenuVerse === verse.verse && (
                            <div className="absolute right-0 top-10 z-10 animate-in fade-in slide-in-from-top-2 w-44 rounded-lg border border-hairline bg-surface p-1 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-elevated transition-colors"
                                onClick={() => {
                                  setActiveMenuVerse(null);
                                  fetchInsights(verse.verse, verse.text);
                                }}
                              >
                                <Sparkles size={16} className="text-scripture" />
                                <span>Gerar Análise</span>
                              </button>
                            </div>
                          )}
                        </div>
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
