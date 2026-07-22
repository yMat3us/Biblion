'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Check, ChevronDown, Compass, HandHeart, Heart, Lock, PlayCircle, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { DetailHeader, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface PlanDia {
  dia: number
  titulo: string | null
  referencia: string
  reflexao: string
  pergunta: string | null
  acao: string | null
  oracao: string | null
}

interface PlanoDetail {
  id: string
  titulo: string
  descricao: string | null
  categoria: string | null
  duracaoDias: number
  visibility: string
  oficial: boolean
  isOwner: boolean
  favorito: boolean
  autor: string
  matricula: { status: string; diaAtual: number } | null
  diasConcluidos: number[]
  dias: PlanDia[]
}

export function PlanoDetailClient({ plano }: { plano: PlanoDetail }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()

  const [matricula, setMatricula] = useState(plano.matricula)
  const [favorito, setFavorito] = useState(plano.favorito)
  const [concluidos, setConcluidos] = useState<Set<number>>(() => new Set(plano.diasConcluidos))
  const [ocupado, setOcupado] = useState(false)
  const [aberto, setAberto] = useState<number | null>(plano.matricula?.diaAtual ?? 1)

  const matriculado = matricula !== null
  const finalizado = matricula?.status === 'COMPLETED'
  const progresso = Math.min(100, Math.round((concluidos.size / Math.max(1, plano.duracaoDias)) * 100))

  async function comecar() {
    if (ocupado || matriculado) return matricula
    setOcupado(true)
    try {
      const response = await fetch(`/api/planos/${plano.id}/matricular`, { method: 'POST' })
      if (!response.ok) throw new Error('enroll-failed')
      const data = (await response.json()) as { status: string; diaAtual: number }
      setMatricula(data)
      toast.success('Plano iniciado. Que seja um tempo de comunhão.')
      return data
    } catch {
      toast.error('Não foi possível iniciar o plano.')
      return null
    } finally {
      setOcupado(false)
    }
  }

  async function alternarDia(dia: number) {
    if (ocupado) return
    if (!matriculado) {
      const iniciada = await comecar()
      if (!iniciada) return
    }

    const concluir = !concluidos.has(dia)
    setConcluidos((atual) => {
      const proximo = new Set(atual)
      if (concluir) proximo.add(dia)
      else proximo.delete(dia)
      return proximo
    })
    setOcupado(true)
    try {
      const response = await fetch(`/api/planos/${plano.id}/dias/${dia}/concluir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluido: concluir }),
      })
      if (!response.ok) throw new Error('progress-failed')
      const data = (await response.json()) as { concluidos: number; finalizado: boolean }
      setMatricula((atual) => (atual ? { ...atual, status: data.finalizado ? 'COMPLETED' : 'ACTIVE' } : atual))
      if (data.finalizado) toast.success('Plano concluído. Ao Senhor toda a glória.')
    } catch {
      setConcluidos((atual) => {
        const proximo = new Set(atual)
        if (concluir) proximo.delete(dia)
        else proximo.add(dia)
        return proximo
      })
      toast.error('Não foi possível salvar o progresso.')
    } finally {
      setOcupado(false)
    }
  }

  async function alternarFavorito() {
    const proximo = !favorito
    setFavorito(proximo)
    try {
      const response = await fetch(`/api/planos/${plano.id}/favoritar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoritar: proximo }),
      })
      if (!response.ok) throw new Error('favorite-failed')
    } catch {
      setFavorito(!proximo)
      toast.error('Não foi possível atualizar o favorito.')
    }
  }

  async function excluir() {
    const ok = await confirm({
      title: 'Excluir plano',
      message: 'Isso remove o plano e o progresso de quem o segue. Não pode ser desfeito.',
      confirmText: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      const response = await fetch(`/api/planos/${plano.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete-failed')
      toast.success('Plano excluído.')
      router.push('/planos')
      router.refresh()
    } catch {
      toast.error('Não foi possível excluir o plano.')
    }
  }

  const proximoDia = useMemo(() => {
    const pendente = plano.dias.find((dia) => !concluidos.has(dia.dia))
    return pendente?.dia ?? plano.dias.at(-1)?.dia ?? 1
  }, [plano.dias, concluidos])

  return (
    <WorkspacePage archetype="reader" size="compact">
      <DetailHeader
        variant="reader"
        backHref="/planos"
        backLabel="Planos"
        index={`Plano · ${plano.duracaoDias} ${plano.duracaoDias === 1 ? 'dia' : 'dias'}`}
        icon={BookOpen}
        eyebrow={plano.categoria ?? 'Leitura guiada'}
        title={plano.titulo}
        description={plano.descricao ?? undefined}
        meta={
          <>
            {plano.oficial && <Badge variant="warning"><ShieldCheck size={11} /> Oficial</Badge>}
            <Badge variant="outline">{plano.visibility === 'PUBLIC' ? 'Público' : 'Privado'}</Badge>
            {!plano.isOwner && <Badge variant="outline">por {plano.autor}</Badge>}
            {plano.visibility === 'PRIVATE' && <Badge variant="outline"><Lock size={11} /> Só você vê</Badge>}
          </>
        }
        actions={
          <>
            <Button variant={favorito ? 'primary' : 'outline'} size="sm" onClick={alternarFavorito} aria-pressed={favorito}>
              <Heart size={15} className={cn(favorito && 'fill-current')} /> {favorito ? 'Favoritado' : 'Favoritar'}
            </Button>
            {plano.isOwner && (
              <Button variant="ghost" size="sm" onClick={excluir}>
                <Trash2 size={15} /> Excluir
              </Button>
            )}
          </>
        }
      />

      {/* Progresso */}
      <div className="surface mb-6 p-5">
        {matriculado ? (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {finalizado ? 'Plano concluído' : `${concluidos.size} de ${plano.duracaoDias} dias`}
              </span>
              <span className="text-subtle">{progresso}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-elevated">
              <div className={cn('h-full rounded-full transition-all', finalizado ? 'bg-success' : 'bg-primary')} style={{ width: `${progresso}%` }} />
            </div>
            {!finalizado && (
              <button
                type="button"
                onClick={() => setAberto(proximoDia)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
              >
                <Compass size={14} /> Ir para o dia {proximoDia}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Comece o plano para acompanhar seu progresso, um dia de cada vez.
            </p>
            <Button onClick={comecar} loading={ocupado} className="shrink-0">
              <PlayCircle size={16} /> Começar plano
            </Button>
          </div>
        )}
      </div>

      {/* Dias */}
      <ol className="space-y-3">
        {plano.dias.map((dia) => {
          const feito = concluidos.has(dia.dia)
          const expandido = aberto === dia.dia
          return (
            <li key={dia.dia} className="surface overflow-hidden">
              <div className="flex items-center gap-3 p-3.5">
                <button
                  type="button"
                  onClick={() => alternarDia(dia.dia)}
                  disabled={ocupado}
                  aria-pressed={feito}
                  aria-label={feito ? `Desmarcar dia ${dia.dia}` : `Concluir dia ${dia.dia}`}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                    feito ? 'border-success bg-success text-white' : 'border-hairline-strong text-subtle hover:border-primary',
                  )}
                >
                  {feito ? <Check size={16} /> : <span className="text-sm font-semibold">{dia.dia}</span>}
                </button>
                <button type="button" onClick={() => setAberto(expandido ? null : dia.dia)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{dia.titulo || `Dia ${dia.dia}`}</span>
                    <span className="mt-0.5 block truncate text-xs text-primary-hover">{dia.referencia}</span>
                  </span>
                  <ChevronDown size={16} className={cn('shrink-0 text-subtle transition-transform', expandido && 'rotate-180')} />
                </button>
              </div>

              {expandido && (
                <div className="space-y-5 border-t border-hairline px-4 py-5 sm:px-5">
                  <DaySection icon={BookOpen} label="Leitura de hoje">
                    <p className="font-serif text-base text-foreground">{dia.referencia}</p>
                    <p className="mt-1 text-xs text-subtle">Abra sua Bíblia e leia a passagem antes de seguir.</p>
                  </DaySection>

                  <DaySection icon={Sparkles} label="Reflexão">
                    <div className="prose max-w-none text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{dia.reflexao}</ReactMarkdown>
                    </div>
                  </DaySection>

                  {dia.pergunta && (
                    <DaySection icon={Compass} label="Pergunta pessoal">
                      <p className="text-sm leading-relaxed text-foreground/90">{dia.pergunta}</p>
                    </DaySection>
                  )}

                  {dia.acao && (
                    <DaySection icon={Check} label="Ação prática">
                      <p className="text-sm leading-relaxed text-foreground/90">{dia.acao}</p>
                    </DaySection>
                  )}

                  {dia.oracao && (
                    <DaySection icon={HandHeart} label="Oração guiada">
                      <p className="text-sm italic leading-relaxed text-muted-foreground">{dia.oracao}</p>
                    </DaySection>
                  )}

                  <Button variant={feito ? 'outline' : 'primary'} size="sm" onClick={() => alternarDia(dia.dia)} loading={ocupado}>
                    <Check size={15} /> {feito ? 'Concluído — desmarcar' : 'Marcar como concluído'}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-8 text-center text-sm italic leading-relaxed text-muted-foreground">
        Sem pressa. Um dia por vez é suficiente para crescer.
      </p>
    </WorkspacePage>
  )
}

function DaySection({ icon: Icon, label, children }: { icon: typeof BookOpen; label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-hover">
        <Icon size={13} /> {label}
      </p>
      {children}
    </section>
  )
}
