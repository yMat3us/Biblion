'use client'

import type { LicaoEBD } from '@prisma/client'
import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileText,
  GraduationCap,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  Sparkles,
  Target,
} from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useConfirm, useToast } from '@/components/ui/Feedback'

type LicaoDetalhada = Pick<
  LicaoEBD,
  | 'id'
  | 'revistaId'
  | 'numero'
  | 'titulo'
  | 'textoBase'
  | 'objetivos'
  | 'introducao'
  | 'topicos'
  | 'conclusao'
  | 'perguntas'
  | 'resumo'
  | 'aplicacao'
  | 'esboco'
>

type TopicoLicao = { titulo: string; conteudo: string }
type EstudoAuxiliar = Pick<LicaoEBD, 'resumo' | 'aplicacao' | 'esboco'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseTopics(raw: unknown): TopicoLicao[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((topic) => {
      if (!isRecord(topic)) return []
      return [{
        titulo: typeof topic.titulo === 'string' ? topic.titulo : '',
        conteudo: typeof topic.conteudo === 'string' ? topic.conteudo : '',
      }]
    })
  } catch {
    return []
  }
}

function parseQuestions(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((question): question is string => typeof question === 'string' && Boolean(question.trim()))
  } catch {
    return []
  }
}

export function LessonClient({ licao }: { licao: LicaoDetalhada }) {
  const toast = useToast()
  const confirm = useConfirm()
  const topics = parseTopics(licao.topicos)
  const questions = parseQuestions(licao.perguntas)
  const [study, setStudy] = useState<EstudoAuxiliar>({
    resumo: licao.resumo,
    aplicacao: licao.aplicacao,
    esboco: licao.esboco,
  })
  const [generating, setGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')

  const hasStudy = Boolean(study.resumo || study.aplicacao || study.esboco)
  const hasLessonContent = Boolean(licao.objetivos || licao.introducao || topics.length || licao.conclusao || questions.length)
  const cleanTitle = licao.titulo.replace(/^Lição\s*\d+[\s-:]*/i, '').trim()
  const backHref = licao.revistaId ? `/ebd/revista/${licao.revistaId}` : '/ebd'
  const contentWords = [licao.objetivos, licao.introducao, ...topics.flatMap((topic) => [topic.titulo, topic.conteudo]), licao.conclusao]
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

  const generateStudy = async () => {
    if (hasStudy) {
      const accepted = await confirm({
        title: 'Regenerar estudo auxiliar',
        message: 'O resumo, a aplicação e o esboço auxiliares atuais serão substituídos por uma nova geração.',
        confirmText: 'Regenerar estudo',
      })
      if (!accepted) return
    }

    setGenerating(true)
    setGenerationStatus('Gerando resumo, aplicação e esboço auxiliar.')
    try {
      const response = await fetch(`/api/ebd/${licao.id}/estudar`, { method: 'POST' })
      if (!response.ok) throw new Error('study-generation-failed')
      const data = await response.json() as EstudoAuxiliar
      setStudy(data)
      setGenerationStatus('Estudo auxiliar gerado com sucesso.')
      toast.success('Estudo auxiliar gerado. Revise antes de ensinar.')
    } catch {
      setGenerationStatus('Não foi possível gerar o estudo auxiliar.')
      toast.error('Não foi possível gerar o estudo auxiliar.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <WorkspacePage size="wide" archetype="library">
      <div className="sr-only" aria-live="polite">{generationStatus}</div>

      <DetailHeader
        variant="reader"
        index={`Caderno do professor · ${licao.numero ? `encontro ${String(licao.numero).padStart(2, '0')}` : 'lição'}`}
        backHref={backHref}
        backLabel="Voltar à revista"
        eyebrow={<><GraduationCap size={13} /> {licao.numero ? `Lição ${licao.numero}` : 'Lição EBD'}</>}
        title={cleanTitle || licao.titulo}
        description="Leia o conteúdo editorial, prepare a aula e use os recursos assistidos apenas quando agregarem clareza ao ensino."
        icon={BookOpen}
        meta={
          <>
            {licao.textoBase && <Badge variant="warning"><BookOpen size={11} /> {licao.textoBase}</Badge>}
            <Badge variant="outline">{topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}</Badge>
            <Badge variant="outline">{questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}</Badge>
          </>
        }
        actions={
          <Link href={`/ebd/${licao.id}/assistente`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <BrainCircuit size={15} /> Abrir assistente
          </Link>
        }
      />

      {!hasLessonContent ? (
        <EmptyState
          icon={FileText}
          eyebrow="Conteúdo indisponível"
          title="Esta lição ainda não possui conteúdo estruturado."
          description="Volte à revista e envie novamente o PDF correspondente para processar o material."
          action={<Link href={backHref} className={buttonStyles()}>Voltar à revista</Link>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="ebd-lesson-document min-w-0 space-y-5">
            {licao.objetivos && (
              <section id="objetivos" className="form-section form-section--accent scroll-mt-24">
                <SectionHeading icon={Target} title="Objetivos da lição" description="Resultados de aprendizagem esperados para este encontro." />
                <MarkdownContent>{licao.objetivos}</MarkdownContent>
              </section>
            )}

            {licao.introducao && (
              <section id="introducao" className="reader-paper scroll-mt-24 p-5 sm:p-7">
                <div className="relative">
                  <SectionHeading icon={BookOpen} title="Introdução" description="Abertura, contexto e direção inicial da aula." />
                  <MarkdownContent>{licao.introducao}</MarkdownContent>
                </div>
              </section>
            )}

            {topics.length > 0 && (
              <section id="topicos" className="form-section scroll-mt-24">
                <SectionHeading icon={ListChecks} title="Desenvolvimento da lição" description={`${topics.length} ${topics.length === 1 ? 'movimento de ensino' : 'movimentos de ensino'} organizados em sequência.`} />
                <div className="space-y-4">
                  {topics.map((topic, index) => (
                    <article key={`${topic.titulo}-${index}`} className="lesson-movement">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-glow">{String(index + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1">
                          {topic.titulo && <h3 className="text-lg font-semibold leading-snug text-foreground">{topic.titulo}</h3>}
                          {topic.conteudo && <div className="mt-4"><MarkdownContent>{topic.conteudo}</MarkdownContent></div>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {licao.conclusao && (
              <section id="conclusao" className="form-section scroll-mt-24">
                <SectionHeading icon={CheckCircle2} title="Conclusão" description="Síntese da verdade estudada e ponte para uma resposta prática." />
                <MarkdownContent>{licao.conclusao}</MarkdownContent>
              </section>
            )}

            {questions.length > 0 && (
              <section id="perguntas" className="form-section scroll-mt-24">
                <SectionHeading icon={MessageCircleQuestion} title="Perguntas para reflexão" description="Prompts para participação, revisão e debate em classe." />
                <ol className="space-y-3">
                  {questions.map((question, index) => (
                    <li key={`${question}-${index}`} className="flex gap-3 rounded-xl border border-hairline bg-elevated/45 p-4 text-sm leading-7 text-muted-foreground">
                      <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary-soft px-1.5 font-mono text-[10px] font-semibold text-primary">Q{index + 1}</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section id="estudo-auxiliar" className="ebd-study-cabinet scroll-mt-24" aria-labelledby="study-helper-title">
              <SectionHeading
                icon={Sparkles}
                title={<span id="study-helper-title">Estudo auxiliar</span>}
                description="Resumo, aplicação e esboço gerados sob demanda para apoiar — não substituir — sua preparação."
                action={<Badge variant="default">Assistido por IA</Badge>}
              />

              {!hasStudy ? (
                <div className="form-section form-section--accent flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <span className="icon-tile h-12 w-12 rounded-2xl"><Lightbulb size={20} /></span>
                  <div className="min-w-0 flex-1"><h3 className="font-semibold text-foreground">Amplie a preparação desta aula</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Gere uma leitura sintética com aplicações e uma sugestão de esboço.</p></div>
                  <Button type="button" loading={generating} onClick={generateStudy}><Sparkles size={16} /> Gerar estudo</Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
                    <p className="text-xs text-muted-foreground">Estudo disponível. Revise afirmações e referências antes da aula.</p>
                    <Button type="button" variant="outline" size="sm" loading={generating} onClick={generateStudy}><Sparkles size={14} /> Regenerar</Button>
                  </div>
                  {study.resumo && <StudySection icon={FileText} title="Resumo da lição" content={study.resumo} />}
                  {study.aplicacao && <StudySection icon={Target} title="Aplicação prática" content={study.aplicacao} accent />}
                  {study.esboco && <StudySection icon={ListChecks} title="Esboço auxiliar" content={study.esboco} scripture />}
                </div>
              )}
            </section>
          </div>

          <aside className="hidden xl:block">
            <div className="space-y-5 xl:sticky xl:top-6">
              <section className="surface p-4">
                <p className="eyebrow mb-4">Roteiro da aula</p>
                <nav aria-label="Seções da lição" className="space-y-1">
                  {licao.objetivos && <OutlineLink href="#objetivos" label="Objetivos" />}
                  {licao.introducao && <OutlineLink href="#introducao" label="Introdução" />}
                  {topics.length > 0 && <OutlineLink href="#topicos" label="Desenvolvimento" />}
                  {licao.conclusao && <OutlineLink href="#conclusao" label="Conclusão" />}
                  {questions.length > 0 && <OutlineLink href="#perguntas" label="Perguntas" />}
                  <OutlineLink href="#estudo-auxiliar" label="Estudo auxiliar" />
                </nav>
              </section>

              <section className="form-section form-section--accent p-4">
                <span className="icon-tile"><BrainCircuit size={17} /></span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">Converse sobre esta lição</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">O assistente recebe o contexto completo do material processado.</p>
                <Link href={`/ebd/${licao.id}/assistente`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-4 w-full' })}>Abrir assistente</Link>
              </section>

              <section className="surface p-4">
                <p className="eyebrow mb-3">Leitura estimada</p>
                <p className="text-2xl font-semibold text-foreground">{Math.max(1, Math.ceil(contentWords / 220))} min</p>
                <p className="mt-1 text-xs text-subtle">{contentWords.toLocaleString('pt-BR')} palavras no material-base</p>
              </section>
            </div>
          </aside>
        </div>
      )}
    </WorkspacePage>
  )
}

function MarkdownContent({ children }: { children: string }) {
  return <div className="prose max-w-none text-sm sm:text-[15px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>
}

function StudySection({ icon: Icon, title, content, accent = false, scripture = false }: { icon: typeof FileText; title: string; content: string; accent?: boolean; scripture?: boolean }) {
  return (
    <article className={`rounded-2xl border p-5 sm:p-6 ${scripture ? 'border-scripture/20 bg-scripture-soft' : accent ? 'border-primary/20 bg-primary-soft/45' : 'border-hairline bg-surface'}`}>
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${scripture ? 'text-scripture' : 'text-foreground'}`}><Icon size={16} /> {title}</h3>
      <MarkdownContent>{content}</MarkdownContent>
    </article>
  )
}

function OutlineLink({ href, label }: { href: string; label: string }) {
  return <a href={href} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary/55" /> {label}</a>
}
