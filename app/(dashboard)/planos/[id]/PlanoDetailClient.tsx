'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Check, ChevronDown, Compass, HandHeart, Heart, Lock, PlayCircle, ShieldCheck, Sparkles, Trash2, ArrowLeft, Maximize2, Pencil, UserPlus, Search } from 'lucide-react'
import { Markdown } from '@/components/ui/Markdown'
import { DetailHeader, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
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
  convite: { status: string } | null
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
  const [leituraIsolada, setLeituraIsolada] = useState<number | null>(null)
  const [conviteStatus, setConviteStatus] = useState(plano.convite?.status)
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; displayName?: string | null; avatarUrl?: string | null }[]>([])
  const [searching, setSearching] = useState(false)
  const [dias, setDias] = useState(plano.dias)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  
  const isGenerating = dias.length < plano.duracaoDias

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/planos/${plano.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.dias && data.dias.length > dias.length) {
            setDias(data.dias)
          }
        }
      } catch (err) {
        console.error('Falha no polling', err)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isGenerating, plano.id, dias.length])

  useEffect(() => {
    if (!searchQuery.trim() || !inviteModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/usuarios?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.usuarios || [])
        }
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [searchQuery, inviteModalOpen])

  async function convidarUsuario(userId: string) {
    if (invitingId) return
    setInvitingId(userId)
    try {
      const res = await fetch(`/api/planos/${plano.id}/convidar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeId: userId })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error?.message || 'Erro ao enviar convite')
      }
      toast.success('Convite enviado com sucesso!')
      setInviteModalOpen(false)
      setSearchQuery('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar convite')
    } finally {
      setInvitingId(null)
    }
  }

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

  async function responderConvite(aceitar: boolean) {
    setOcupado(true)
    try {
      const response = await fetch(`/api/planos/${plano.id}/convites/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: aceitar }),
      })
      if (!response.ok) throw new Error('Falha ao responder')
      
      setConviteStatus(aceitar ? 'ACCEPTED' : 'DECLINED')
      if (aceitar) {
        setMatricula({ status: 'ACTIVE', diaAtual: 1 })
        toast.success('Convite aceito! O plano foi adicionado aos seus planos ativos.')
      } else {
        toast.success('Convite recusado.')
      }
    } catch {
      toast.error('Não foi possível responder ao convite.')
    } finally {
      setOcupado(false)
    }
  }

  const proximoDia = useMemo(() => {
    const pendente = dias.find((dia) => !concluidos.has(dia.dia))
    return pendente?.dia ?? dias.at(-1)?.dia ?? 1
  }, [dias, concluidos])

  if (leituraIsolada !== null) {
    const dia = dias.find(d => d.dia === leituraIsolada)
    if (!dia) {
      setLeituraIsolada(null)
      return null
    }
    const feito = concluidos.has(dia.dia)
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8">
        <div className="mx-auto max-w-3xl pb-24 pt-8">
          <button 
            onClick={() => setLeituraIsolada(null)}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Voltar aos planos
          </button>
          
          <div className="mb-12">
            <span className="mb-3 block text-sm font-bold uppercase tracking-widest text-primary">Dia {dia.dia}</span>
            <h1 className="font-serif text-3xl font-bold text-foreground sm:text-5xl">{dia.titulo || 'Leitura de Hoje'}</h1>
            <p className="mt-4 border-l-4 border-primary/30 pl-4 font-serif text-xl text-muted-foreground">
              {dia.referencia}
            </p>
          </div>

          <div className="space-y-12">
            <div className="prose prose-lg prose-p:leading-relaxed prose-headings:font-serif max-w-none text-foreground/90">
              <Markdown>{dia.reflexao}</Markdown>
            </div>

            {dia.pergunta && (
              <div className="rounded-3xl bg-amber-500/10 p-8 shadow-inner border border-amber-500/20">
                <DaySection icon={Compass} label="Pergunta pessoal" colorClass="text-amber-600">
                  <p className="font-serif text-lg italic text-amber-950 dark:text-amber-200">{dia.pergunta}</p>
                </DaySection>
              </div>
            )}

            {dia.acao && (
              <div className="rounded-3xl bg-emerald-500/10 p-8 shadow-inner border border-emerald-500/20">
                <DaySection icon={Check} label="Ação prática" colorClass="text-emerald-600">
                  <p className="font-serif text-lg text-emerald-950 dark:text-emerald-200">{dia.acao}</p>
                </DaySection>
              </div>
            )}

            {dia.oracao && (
              <div className="rounded-3xl bg-indigo-500/10 p-8 shadow-inner border border-indigo-500/20">
                <DaySection icon={HandHeart} label="Oração guiada" colorClass="text-indigo-600">
                  <p className="font-serif text-lg italic text-indigo-950 dark:text-indigo-200">{dia.oracao}</p>
                </DaySection>
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-hairline bg-background/80 p-4 backdrop-blur-lg sm:p-6">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => setLeituraIsolada(null)}>
                <ArrowLeft size={16} /> Fechar
              </Button>
              <Button 
                variant={feito ? 'outline' : 'primary'} 
                size="lg" 
                onClick={() => alternarDia(dia.dia)} 
                loading={ocupado}
                className="flex-1 sm:flex-none"
              >
                <Check size={18} /> {feito ? 'Dia concluído' : 'Concluir dia'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
              <>
                <Button variant="ghost" size="sm" onClick={() => setInviteModalOpen(true)}>
                  <UserPlus size={15} /> Convidar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/planos/${plano.id}/editar`)}>
                  <Pencil size={15} /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={excluir}>
                  <Trash2 size={15} /> Excluir
                </Button>
              </>
            )}
          </>
        }
      />
      
      {conviteStatus === 'PENDING' && (
        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-primary/20 bg-primary-soft/30 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-primary">Você foi convidado!</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {plano.autor} te convidou para fazer este plano de leitura em conjunto.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => responderConvite(false)} loading={ocupado}>Recusar</Button>
            <Button variant="primary" onClick={() => responderConvite(true)} loading={ocupado}>Aceitar Convite</Button>
          </div>
        </div>
      )}
      
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Convidar amigo para o plano">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Convide até 10 amigos para realizar este plano com você. Eles receberão uma notificação para aceitar ou recusar.
          </p>
          <Input 
            icon={<Search size={16} />}
            placeholder="Buscar por @usuario ou nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {searching ? (
              <p className="text-center text-sm text-muted-foreground py-4">Buscando...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-surface border border-hairline rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">{u.displayName || u.username}</span>
                    <span className="text-xs text-subtle">@{u.username}</span>
                  </div>
                  <Button size="sm" variant="outline" loading={invitingId === u.id} onClick={() => convidarUsuario(u.id)}>
                    Convidar
                  </Button>
                </div>
              ))
            ) : searchQuery.trim().length > 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum usuário encontrado.</p>
            ) : null}
          </div>
        </div>
      </Modal>

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
      <ol className="grid grid-cols-1 gap-4">
        {dias.map((dia) => {
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
                  <div className="flex justify-between items-center">
                    <DaySection icon={BookOpen} label="Leitura de hoje">
                      <p className="font-serif text-base text-foreground">{dia.referencia}</p>
                      <p className="mt-1 text-xs text-subtle">Abra sua Bíblia e leia a passagem antes de seguir.</p>
                    </DaySection>
                    
                    <Button variant="outline" size="sm" onClick={() => setLeituraIsolada(dia.dia)}>
                      <Maximize2 size={15} /> Modo Leitura
                    </Button>
                  </div>

                  <DaySection icon={Sparkles} label="Reflexão">
                    <div className="prose max-w-none text-sm leading-relaxed">
                      <Markdown>{dia.reflexao}</Markdown>
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

      {isGenerating && (
        <div className="mt-6 flex flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-primary/20 bg-primary-soft/50 py-10 text-center animate-pulse">
          <Sparkles className="text-primary" size={24} />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">A inteligência artificial está trabalhando...</h3>
            <p className="text-xs text-muted-foreground">
              {dias.length > 0 ? `Escrevendo o dia ${dias.length + 1}...` : 'Preparando o plano...'}
            </p>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm italic leading-relaxed text-muted-foreground">
        Sem pressa. Um dia por vez é suficiente para crescer.
      </p>
    </WorkspacePage>
  )
}

function DaySection({ icon: Icon, label, colorClass = "text-primary-hover", children }: { icon: typeof BookOpen; label: string; colorClass?: string; children: React.ReactNode }) {
  return (
    <section>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]", colorClass)}>
        <Icon size={13} /> {label}
      </p>
      {children}
    </section>
  )
}
