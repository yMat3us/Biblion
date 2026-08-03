'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlignLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  Edit,
  Flag,
  Globe,
  Layers3,
  Link2,
  Lock,
  Mic,
  Target,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { formatDate } from '@/lib/utils'

interface Sermon {
  id: string
  titulo: string
  tema?: string | null
  textoBase: string
  introducao?: string | null
  topicos?: string | null
  conclusao?: string | null
  aplicacao?: string | null
  categoria?: string | null
  publicado: boolean
  visibility: string
  createdAt: Date
  updatedAt: Date
}

interface RelatedSermon { id: string; titulo: string; textoBase: string }
interface RelatedLesson { id: string; titulo: string; textoBase: string | null }
interface RelatedContent {
  localResults: { sermons: RelatedSermon[]; lessons: RelatedLesson[] }
}

interface SubtopicParsed { titulo: string; conteudo: string; versiculos: string }
interface TopicParsed { titulo: string; conteudo: string; versiculos: string; subtopicos?: SubtopicParsed[] }

type RelatedStatus = 'loading' | 'success' | 'error'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSubtopics(value: unknown): SubtopicParsed[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((subtopic) => {
    if (!isRecord(subtopic)) return []
    return [{
      titulo: typeof subtopic.titulo === 'string' ? subtopic.titulo : '',
      conteudo: typeof subtopic.conteudo === 'string' ? subtopic.conteudo : '',
      versiculos: typeof subtopic.versiculos === 'string' ? subtopic.versiculos : '',
    }]
  })
}

function parseTopics(raw?: string | null): TopicParsed[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((topic) => {
      if (!isRecord(topic)) return []
      return [{
        titulo: typeof topic.titulo === 'string' ? topic.titulo : '',
        conteudo: typeof topic.conteudo === 'string' ? topic.conteudo : '',
        versiculos: typeof topic.versiculos === 'string' ? topic.versiculos : '',
        subtopicos: parseSubtopics(topic.subtopicos),
      }]
    })
  } catch {
    return []
  }
}

export function SermonDetailClient({ sermao }: { sermao: Sermon }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState(sermao.visibility)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [relatedContent, setRelatedContent] = useState<RelatedContent | null>(null)
  const [relatedStatus, setRelatedStatus] = useState<RelatedStatus>('loading')

  async function setVisibilidade(next: string) {
    if (savingVisibility || next === visibility) return
    const anterior = visibility
    setVisibility(next)
    setSavingVisibility(true)
    try {
      const response = await fetch(`/api/sermoes/${sermao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      })
      if (!response.ok) throw new Error('visibility-failed')
      toast.success(next === 'PUBLIC' ? 'Sermão visível no seu perfil público.' : 'Sermão agora é privado.')
    } catch {
      setVisibility(anterior)
      toast.error('Não foi possível alterar a visibilidade.')
    } finally {
      setSavingVisibility(false)
    }
  }
  const topics = parseTopics(sermao.topicos)
  const hasInvalidTopics = Boolean(sermao.topicos && topics.length === 0)
  const visibleTopics = topics.filter((topic) => topic.titulo || topic.conteudo)
  const relatedSermons = relatedContent?.localResults.sermons.filter((item) => item.id !== sermao.id) ?? []
  const relatedLessons = relatedContent?.localResults.lessons ?? []
  const textSize = [sermao.introducao, ...topics.flatMap((topic) => [topic.titulo, topic.conteudo]), sermao.conclusao, sermao.aplicacao]
    .filter(Boolean)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  useEffect(() => {
    let cancelled = false
    const query = sermao.tema || sermao.titulo
    void fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, includeAi: false }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('related-failed')))
      .then((data: RelatedContent) => {
        if (!cancelled) {
          setRelatedContent(data)
          setRelatedStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setRelatedStatus('error')
      })
    return () => { cancelled = true }
  }, [sermao.tema, sermao.titulo])

  const handleDelete = async () => {
    const accepted = await confirm({
      title: 'Excluir sermão',
      message: `O sermão “${sermao.titulo}” será removido permanentemente.`,
      danger: true,
      confirmText: 'Excluir',
    })
    if (!accepted) return
    try {
      const response = await fetch(`/api/sermoes/${sermao.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete-failed')
      toast.success('Sermão excluído.')
      router.push('/sermoes')
      router.refresh()
    } catch {
      toast.error('Não foi possível excluir o sermão.')
    }
  }

  const handleCopy = async () => {
    const text = `${sermao.titulo}\nTexto base: ${sermao.textoBase}${sermao.tema ? `\nTema: ${sermao.tema}` : ''}\n\nINTRODUÇÃO\n${sermao.introducao || ''}\n\nDESENVOLVIMENTO\n${topics.map((topic, index) => `${index + 1}. ${topic.titulo}\n${topic.conteudo}${topic.versiculos ? `\nReferências: ${topic.versiculos}` : ''}${topic.subtopicos?.map((subtopic, subIndex) => `\n  ${index + 1}.${subIndex + 1}. ${subtopic.titulo}\n  ${subtopic.conteudo}${subtopic.versiculos ? `\n  Referências: ${subtopic.versiculos}` : ''}`).join('\n') ?? ''}`).join('\n\n')}\n\nCONCLUSÃO\n${sermao.conclusao || ''}\n\nAPLICAÇÃO\n${sermao.aplicacao || ''}`.trim()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Sermão copiado para a área de transferência.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar o sermão.')
    }
  }

  return (
    <WorkspacePage size="wide" archetype="manuscript">
      <DetailHeader
        variant="manuscript"
        index={`Manuscrito · ${sermao.publicado ? 'edição publicada' : 'em preparação'}`}
        backHref="/sermoes"
        backLabel="Biblioteca de sermões"
        eyebrow={<><Mic size={13} /> Documento homilético</>}
        title={sermao.titulo}
        description={sermao.tema ? `Tema: ${sermao.tema}` : 'Sermão estruturado no seu acervo pessoal.'}
        icon={Mic}
        meta={
          <>
            {sermao.categoria && <Badge variant="default">{sermao.categoria}</Badge>}
            <Badge variant={sermao.publicado ? 'success' : 'outline'}>{sermao.publicado ? 'Publicado' : 'Rascunho'}</Badge>
            <Badge variant="warning"><BookOpen size={11} /> {sermao.textoBase}</Badge>
            <Badge variant="outline"><Calendar size={11} /> Atualizado em {formatDate(sermao.updatedAt)}</Badge>
          </>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>{copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}{copied ? 'Copiado' : 'Copiar'}</Button>
            <Link href={`/sermoes/${sermao.id}/editar`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}><Edit size={14} /> Editar</Link>
            <Button type="button" variant="ghost" size="sm" onClick={handleDelete} className="hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /> Excluir</Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface/60 p-3.5">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Globe size={15} className="text-primary" /> Visibilidade no seu perfil
        </span>
        <div className="flex gap-1.5" role="group" aria-label="Visibilidade do sermão">
          <button
            type="button"
            onClick={() => setVisibilidade('PRIVATE')}
            disabled={savingVisibility}
            aria-pressed={visibility !== 'PUBLIC'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${visibility !== 'PUBLIC' ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong text-muted-foreground hover:text-foreground'}`}
          >
            <Lock size={13} /> Privado
          </button>
          <button
            type="button"
            onClick={() => setVisibilidade('PUBLIC')}
            disabled={savingVisibility}
            aria-pressed={visibility === 'PUBLIC'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${visibility === 'PUBLIC' ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong text-muted-foreground hover:text-foreground'}`}
          >
            <Globe size={13} /> Público
          </button>
        </div>
        <span className="text-xs text-subtle">{visibility === 'PUBLIC' ? 'Aparece no seu perfil público.' : 'Somente você vê este sermão.'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <article className="sermon-document">
          {sermao.introducao && (
            <section className="form-section">
              <SectionHeading icon={AlignLeft} title="Introdução" description="Abertura e tensão central da mensagem." />
              <p className="whitespace-pre-wrap text-[15px] leading-8 text-muted-foreground">{sermao.introducao}</p>
            </section>
          )}

          {visibleTopics.length > 0 && (
            <section className="form-section">
              <SectionHeading icon={Layers3} title="Desenvolvimento" description={`${visibleTopics.length} ${visibleTopics.length === 1 ? 'movimento principal' : 'movimentos principais'} na mensagem.`} />
              <div className="space-y-5">
                {visibleTopics.map((topic, index) => (
                  <div key={`${topic.titulo}-${index}`} className="manuscript-movement manuscript-movement--reading">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-glow">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        {topic.titulo && <h3 className="text-lg font-semibold text-foreground">{topic.titulo}</h3>}
                        {topic.versiculos && <Badge variant="warning" className="mt-2"><BookOpen size={11} /> {topic.versiculos}</Badge>}
                        {topic.conteudo && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{topic.conteudo}</p>}

                        {topic.subtopicos && topic.subtopicos.length > 0 && (
                          <div className="mt-5 space-y-3 border-l border-primary/25 pl-4">
                            {topic.subtopicos.map((subtopic, subIndex) => (
                              <div key={`${subtopic.titulo}-${subIndex}`} className="manuscript-submovement">
                                <div className="flex items-center gap-2"><Badge variant="outline">{index + 1}.{subIndex + 1}</Badge><h4 className="text-sm font-semibold text-foreground">{subtopic.titulo}</h4></div>
                                {subtopic.conteudo && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{subtopic.conteudo}</p>}
                                {subtopic.versiculos && <p className="mt-2 flex items-center gap-1.5 text-xs text-scripture"><BookOpen size={12} /> {subtopic.versiculos}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasInvalidTopics && (
            <div role="alert" className="flex gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" /> O desenvolvimento salvo não pôde ser interpretado. Abra o editor para recuperar ou substituir essa estrutura.
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {sermao.conclusao && (
              <section className="form-section">
                <SectionHeading icon={Flag} title="Conclusão" />
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{sermao.conclusao}</p>
              </section>
            )}
            {sermao.aplicacao && (
              <section className="form-section form-section--accent">
                <SectionHeading icon={Target} title="Aplicação prática" />
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{sermao.aplicacao}</p>
              </section>
            )}
          </div>

          <section className="border-t border-hairline pt-7" aria-labelledby="related-title">
            <SectionHeading icon={Link2} title={<span id="related-title">Conexões do seu acervo</span>} description="Outros materiais relacionados pelo tema deste sermão." />
            {relatedStatus === 'loading' && <div role="status" className="grid gap-4 md:grid-cols-2"><span className="sr-only">Buscando conexões…</span><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /></div>}
            {relatedStatus === 'error' && <div className="rounded-2xl border border-dashed border-hairline p-6 text-center text-sm text-subtle">As conexões não puderam ser carregadas, mas o sermão continua disponível.</div>}
            {relatedStatus === 'success' && (
              <div className="grid gap-5 md:grid-cols-2">
                <RelatedColumn title="Outros sermões" icon={Mic} items={relatedSermons.map((item) => ({ ...item, href: `/sermoes/${item.id}` }))} />
                <RelatedColumn title="Lições EBD" icon={BookOpen} items={relatedLessons.map((item) => ({ ...item, textoBase: item.textoBase ?? '', href: `/ebd/${item.id}` }))} />
              </div>
            )}
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="surface sticky top-6 p-4">
            <p className="eyebrow mb-4">Visão editorial</p>
            <dl className="divide-y divide-hairline text-sm">
              <div className="py-3"><dt className="text-subtle">Palavras</dt><dd className="mt-1 text-lg font-semibold text-foreground">{textSize.toLocaleString('pt-BR')}</dd></div>
              <div className="py-3"><dt className="text-subtle">Tópicos</dt><dd className="mt-1 text-lg font-semibold text-foreground">{visibleTopics.length}</dd></div>
              <div className="py-3"><dt className="text-subtle">Texto base</dt><dd className="mt-1 text-sm font-medium text-scripture">{sermao.textoBase}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </WorkspacePage>
  )
}

function RelatedColumn({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: typeof Mic
  items: Array<{ id: string; titulo: string; textoBase: string; href: string }>
}) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon size={15} className="text-primary" /> {title}</h3><Badge variant="outline">{items.length}</Badge></div>
      {items.length > 0 ? (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group block rounded-xl border border-hairline bg-elevated/45 p-3.5 transition-colors hover:border-primary/25 hover:bg-elevated">
              <div className="flex items-start gap-2"><p className="min-w-0 flex-1 text-sm font-medium text-foreground group-hover:text-primary-hover">{item.titulo}</p><ArrowUpRight size={13} className="shrink-0 text-subtle group-hover:text-primary" /></div>
              {item.textoBase && <p className="mt-1.5 text-xs text-scripture">{item.textoBase}</p>}
            </Link>
          ))}
        </div>
      ) : <p className="rounded-xl border border-dashed border-hairline p-5 text-center text-xs text-subtle">Nenhum material relacionado.</p>}
    </div>
  )
}
