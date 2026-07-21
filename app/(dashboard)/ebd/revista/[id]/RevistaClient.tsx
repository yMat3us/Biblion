'use client'

import type { LicaoEBD, RevistaEBD } from '@prisma/client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  GraduationCap,
  LibraryBig,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { useConfirm, useToast } from '@/components/ui/Feedback'

type LicaoResumo = Pick<LicaoEBD, 'id' | 'numero' | 'titulo' | 'textoBase'>

type RevistaDetalhada = Pick<RevistaEBD, 'id' | 'titulo' | 'trimestre' | 'ano' | 'tema'> & {
  licoes: LicaoResumo[]
}

export function RevistaClient({ revista }: { revista: RevistaDetalhada }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})
  const [uploadStatus, setUploadStatus] = useState('')
  const [deletingMagazine, setDeletingMagazine] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, numero: number) => {
    const file = event.target.files?.[0]
    if (!file) return
    setLoadingMap((current) => ({ ...current, [numero]: true }))
    setUploadStatus(`Processando o PDF da lição ${numero}.`)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('revistaId', revista.id)
    formData.append('numero', numero.toString())

    try {
      const response = await fetch('/api/ebd/upload', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: { message?: string } } | null
        throw new Error(data?.error?.message || `Não foi possível processar a lição ${numero}.`)
      }
      setUploadStatus(`Lição ${numero} processada com sucesso.`)
      toast.success(`Lição ${numero} adicionada à revista.`)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao processar o PDF.'
      setUploadStatus(message)
      toast.error(message)
    } finally {
      setLoadingMap((current) => ({ ...current, [numero]: false }))
      event.target.value = ''
    }
  }

  const handleDeleteLicao = async (licao: LicaoResumo) => {
    const confirmed = await confirm({
      title: `Excluir lição ${licao.numero ?? ''}`.trim(),
      message: `“${cleanTitle(licao.titulo)}” será removida permanentemente desta revista.`,
      danger: true,
      confirmText: 'Excluir lição',
    })
    if (!confirmed) return
    try {
      const response = await fetch(`/api/ebd/${licao.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('lesson-delete-failed')
      toast.success('Lição excluída.')
      router.refresh()
    } catch {
      toast.error('Não foi possível excluir a lição.')
    }
  }

  const handleDeleteRevista = async () => {
    const confirmed = await confirm({
      title: 'Excluir revista completa',
      message: `“${revista.titulo}” e todas as suas lições serão removidas permanentemente.`,
      danger: true,
      confirmText: 'Excluir revista',
    })
    if (!confirmed) return
    setDeletingMagazine(true)
    try {
      const response = await fetch(`/api/ebd/revistas/${revista.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('magazine-delete-failed')
      toast.success('Revista excluída.')
      router.push('/ebd')
      router.refresh()
    } catch {
      toast.error('Não foi possível excluir a revista.')
      setDeletingMagazine(false)
    }
  }

  const extraLicoes = revista.licoes.filter((lesson) => !lesson.numero || lesson.numero > 13)
  const lessonSlots = Array.from({ length: 13 }, (_, index) => {
    const numero = index + 1
    return { numero, lesson: revista.licoes.find((candidate) => candidate.numero === numero) }
  })
  const completedLessons = lessonSlots.filter(({ lesson }) => Boolean(lesson)).length
  const progress = Math.round((completedLessons / 13) * 100)

  return (
    <WorkspacePage size="full" archetype="library">
      <div className="sr-only" aria-live="polite">{uploadStatus}</div>

      <DetailHeader
        variant="reader"
        index="Edição trimestral · 13 encontros"
        backHref="/ebd"
        backLabel="Biblioteca EBD"
        eyebrow={<><GraduationCap size={13} /> Coleção trimestral</>}
        title={revista.titulo}
        description={revista.tema || 'Organize as treze lições, acompanhe o trimestre e abra o assistente contextual de cada aula.'}
        icon={GraduationCap}
        meta={
          <>
            {revista.trimestre && <Badge variant="default"><CalendarDays size={11} /> {revista.trimestre}</Badge>}
            {revista.ano && <Badge variant="outline">{revista.ano}</Badge>}
            <Badge variant="success"><CheckCircle2 size={11} /> {completedLessons}/13 lições</Badge>
          </>
        }
        actions={
          <Button type="button" variant="ghost" size="sm" loading={deletingMagazine} onClick={handleDeleteRevista} className="hover:bg-destructive/10 hover:text-destructive">
            <Trash2 size={14} /> Excluir revista
          </Button>
        }
      />

      <section className="ebd-edition-overview" aria-label="Progresso da revista">
        <MagazineCover id={revista.id} title={revista.titulo} />
        <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow flex items-center gap-2 text-primary-hover"><LibraryBig size={14} /> Jornada do trimestre</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{completedLessons === 13 ? 'Revista completa e pronta para estudo.' : `${13 - completedLessons} ${13 - completedLessons === 1 ? 'lição pendente' : 'lições pendentes'}`}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Envie um PDF por lição. O conteúdo processado alimenta tanto a leitura estruturada quanto o assistente contextual.</p>
            </div>
            <span className="font-mono text-2xl font-semibold text-primary">{progress}%</span>
          </div>
          <progress value={completedLessons} max={13} className="mt-6 h-2 w-full overflow-hidden rounded-full accent-primary" aria-label={`${completedLessons} de 13 lições adicionadas`} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-subtle">
            <span className="flex items-center gap-1.5"><FileText size={13} /> PDF por aula</span>
            <span className="flex items-center gap-1.5"><Sparkles size={13} /> Extração assistida</span>
            <span className="flex items-center gap-1.5"><BrainCircuit size={13} /> Chat contextual</span>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="lessons-grid-title">
        <SectionHeading
          icon={BookOpen}
          title={<span id="lessons-grid-title">Mapa das 13 lições</span>}
          description="Cada posição corresponde a uma aula do trimestre."
          action={<Badge variant="outline">{completedLessons} preenchidas</Badge>}
        />

        <div className="ebd-lesson-sequence">
          {lessonSlots.map(({ numero, lesson }) => (
            <article key={numero} data-state={lesson ? 'ready' : 'empty'} className="ebd-lesson-slot">
              <div className="mb-5 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${lesson ? 'bg-primary text-primary-foreground shadow-glow' : 'border border-hairline bg-elevated text-subtle'}`}>{String(numero).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Lição {numero}</p>
                  <p className="text-[11px] text-subtle">{lesson ? 'Conteúdo disponível' : 'Aguardando PDF'}</p>
                </div>
                <Badge variant={lesson ? 'success' : 'outline'}>{lesson ? 'Pronta' : 'Vazia'}</Badge>
              </div>

              {lesson ? (
                <>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-3 text-lg font-semibold leading-snug text-foreground">{cleanTitle(lesson.titulo)}</h3>
                    {lesson.textoBase && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-scripture"><BookOpen size={13} /> {lesson.textoBase}</p>}
                  </div>
                  <LessonActions lesson={lesson} onDelete={handleDeleteLicao} />
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-background/20 p-5 text-center transition-colors hover:border-primary/30 hover:bg-primary-soft/40">
                  {loadingMap[numero] ? (
                    <>
                      <span className="h-9 w-9 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true" />
                      <p className="mt-4 text-sm font-medium text-foreground">Interpretando a lição…</p>
                      <p className="mt-1 text-xs text-subtle">O processamento pode levar alguns instantes.</p>
                    </>
                  ) : (
                    <>
                      <span className="icon-tile h-11 w-11 rounded-2xl"><Upload size={18} /></span>
                      <p className="mt-4 text-sm font-medium text-foreground">Adicionar PDF</p>
                      <p className="mt-1 text-xs leading-5 text-subtle">Selecione o material da lição {numero}.</p>
                      <label htmlFor={`lesson-upload-${numero}`} className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-4 cursor-pointer' })}>
                        <Upload size={14} /> Escolher arquivo
                      </label>
                      <input
                        id={`lesson-upload-${numero}`}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(event) => handleFileUpload(event, numero)}
                        disabled={loadingMap[numero]}
                      />
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {extraLicoes.length > 0 && (
        <section className="mt-12 border-t border-hairline pt-8" aria-labelledby="extra-lessons-title">
          <SectionHeading icon={LibraryBig} title={<span id="extra-lessons-title">Conteúdos adicionais</span>} description="Lições fora da sequência principal de treze encontros." />
          <div className="ebd-lesson-sequence ebd-lesson-sequence--extras">
            {extraLicoes.map((lesson) => (
              <article key={lesson.id} className="ebd-lesson-slot ebd-lesson-slot--extra">
                <Badge variant="outline" className="w-fit">Material extra</Badge>
                <h3 className="mt-4 line-clamp-3 text-lg font-semibold leading-snug text-foreground">{cleanTitle(lesson.titulo)}</h3>
                {lesson.textoBase && <p className="mt-3 text-xs font-medium text-scripture">{lesson.textoBase}</p>}
                <LessonActions lesson={lesson} onDelete={handleDeleteLicao} />
              </article>
            ))}
          </div>
        </section>
      )}
    </WorkspacePage>
  )
}

function LessonActions({ lesson, onDelete }: { lesson: LicaoResumo; onDelete: (lesson: LicaoResumo) => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
      <Link href={`/ebd/${lesson.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'flex-1' })}><Eye size={14} /> Abrir lição</Link>
      <Link href={`/ebd/${lesson.id}/assistente`} className={buttonStyles({ variant: 'outline', size: 'sm', className: 'flex-1' })}><BrainCircuit size={14} /> Assistente</Link>
      <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(lesson)} aria-label={`Excluir ${cleanTitle(lesson.titulo)}`} className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></Button>
    </div>
  )
}

function MagazineCover({ id, title }: { id: string; title: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="relative flex min-h-48 items-center justify-center overflow-hidden border-b border-hairline bg-[radial-gradient(circle_at_30%_20%,var(--color-primary-soft),transparent_48%),var(--color-elevated)] md:border-b-0 md:border-r">
        <GraduationCap size={52} className="text-primary/55" />
        <span className="absolute inset-x-5 bottom-4 line-clamp-2 text-center font-serif text-xs text-muted-foreground">{title}</span>
      </div>
    )
  }
  return (
    <div className="relative min-h-48 overflow-hidden border-b border-hairline bg-elevated md:border-b-0 md:border-r">
      <Image
        src={`/api/ebd/revistas/${id}/capa`}
        alt={`Capa da revista ${title}`}
        fill
        sizes="(min-width: 768px) 12rem, 100vw"
        unoptimized
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-transparent" />
    </div>
  )
}

function cleanTitle(title: string) {
  return title.replace(/^Lição\s*\d+[\s-:]*/i, '').trim()
}
