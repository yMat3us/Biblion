'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ban,
  BookOpen,
  Check,
  Clock,
  FileText,
  GraduationCap,
  Heart,
  Lock,
  MessageCircle,
  Mic,
  PenTool,
  ShieldOff,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import type { RelationshipStatus } from '@/lib/services/social'
import type { PublicContent } from '@/lib/services/public-profile'

interface Perfil {
  id: string
  publicId: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
}

export function ProfileView({
  perfil,
  relationshipInicial,
  restrito,
  conteudo,
}: {
  perfil: Perfil
  relationshipInicial: RelationshipStatus
  restrito: boolean
  conteudo: PublicContent
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [rel, setRel] = useState<RelationshipStatus>(relationshipInicial)
  const [ocupado, setOcupado] = useState(false)
  const nome = perfil.displayName || perfil.username

  async function enviarMensagem() {
    try {
      const response = await fetch('/api/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alvoId: perfil.id }),
      })
      if (!response.ok) throw new Error('conversa-failed')
      const data = (await response.json()) as { id: string }
      router.push(`/conversas/${data.id}`)
    } catch {
      toast.error('Não foi possível abrir a conversa.')
    }
  }

  async function acao(url: string, body: Record<string, unknown>, otimista: RelationshipStatus, sucesso?: string) {
    if (ocupado) return
    const anterior = rel
    setRel(otimista)
    setOcupado(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('action-failed')
      const data = (await response.json()) as { status?: RelationshipStatus }
      if (data.status) setRel(data.status)
      if (sucesso) toast.success(sucesso)
    } catch {
      setRel(anterior)
      toast.error('Não foi possível concluir a ação.')
    } finally {
      setOcupado(false)
    }
  }

  const solicitar = () => acao('/api/amigos/solicitar', { alvoId: perfil.id }, 'pending_sent')
  const aceitar = () => acao('/api/amigos/responder', { solicitanteId: perfil.id, aceitar: true }, 'friends', `Agora você e ${nome} são amigos.`)
  const recusar = () => acao('/api/amigos/responder', { solicitanteId: perfil.id, aceitar: false }, 'none')

  async function remover() {
    const ok = await confirm({ title: 'Remover amizade', message: `Remover ${nome} dos seus amigos?`, confirmText: 'Remover', danger: true })
    if (ok) void acao('/api/amigos/remover', { alvoId: perfil.id }, 'none')
  }

  async function bloquear() {
    const ok = await confirm({
      title: 'Bloquear usuário',
      message: `${nome} não poderá encontrar seu perfil nem falar com você. Vocês deixam de ser amigos.`,
      confirmText: 'Bloquear',
      danger: true,
    })
    if (ok) void acao('/api/bloquear', { alvoId: perfil.id, bloquear: true }, 'blocked', `${nome} foi bloqueado.`)
  }

  const desbloquear = () => acao('/api/bloquear', { alvoId: perfil.id, bloquear: false }, 'none', 'Usuário desbloqueado.')

  return (
    <WorkspacePage archetype="cabinet" size="wide">
      <PageHeader
        variant="cabinet"
        index={perfil.publicId ? `ID · ${perfil.publicId}` : 'Perfil'}
        eyebrow="Perfil da comunidade"
        title={nome}
        description={perfil.bio ?? undefined}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary-soft bg-cover bg-center text-xl font-semibold text-primary"
              style={perfil.avatarUrl ? { backgroundImage: `url(${JSON.stringify(perfil.avatarUrl)})` } : undefined}
            >
              {!perfil.avatarUrl && nome.charAt(0).toLocaleUpperCase('pt-BR')}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">@{perfil.username}</p>
              <div className="mt-1"><AcaoRelacionamento rel={rel} ocupado={ocupado} onSolicitar={solicitar} onAceitar={aceitar} onRecusar={recusar} onRemover={remover} onDesbloquear={desbloquear} onMensagem={enviarMensagem} /></div>
            </div>
          </div>
        }
        action={
          rel !== 'self' && rel !== 'blocked' ? (
            <Button variant="ghost" size="sm" onClick={bloquear} disabled={ocupado} className="hover:bg-destructive/10 hover:text-destructive">
              <Ban size={15} /> Bloquear
            </Button>
          ) : undefined
        }
      />

      {rel === 'blocked' ? (
        <div className="empty-state empty-state--compact">
          <span aria-hidden="true" className="empty-state__halo" />
          <span className="empty-state__icon"><ShieldOff size={26} /></span>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">Você bloqueou este usuário. Desbloqueie para ver o perfil.</p>
        </div>
      ) : restrito ? (
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state__halo" />
          <span className="empty-state__icon"><Lock size={26} /></span>
          <h2 className="mt-5 text-lg font-semibold text-foreground">Perfil somente para amigos</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Envie uma solicitação de amizade para ver o conteúdo público de {nome}.</p>
        </div>
      ) : (
        <ConteudoPerfil conteudo={conteudo} nome={nome} />
      )}
    </WorkspacePage>
  )
}

function AcaoRelacionamento({
  rel,
  ocupado,
  onSolicitar,
  onAceitar,
  onRecusar,
  onRemover,
  onDesbloquear,
  onMensagem,
}: {
  rel: RelationshipStatus
  ocupado: boolean
  onSolicitar: () => void
  onAceitar: () => void
  onRecusar: () => void
  onRemover: () => void
  onDesbloquear: () => void
  onMensagem: () => void
}) {
  if (rel === 'self') return <Link href="/perfil" className="text-sm font-medium text-primary hover:text-primary-hover">Editar seu perfil</Link>
  if (rel === 'blocked') return <Button size="sm" variant="outline" onClick={onDesbloquear} disabled={ocupado}><ShieldOff size={14} /> Desbloquear</Button>
  if (rel === 'friends') return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="success"><Check size={11} /> Amigos</Badge>
      <Button size="sm" variant="outline" onClick={onMensagem}><MessageCircle size={14} /> Mensagem</Button>
      <Button size="sm" variant="ghost" onClick={onRemover} disabled={ocupado}><UserMinus size={14} /> Remover</Button>
    </div>
  )
  if (rel === 'pending_sent') return <Badge variant="outline"><Clock size={11} /> Solicitação enviada</Badge>
  if (rel === 'pending_received') return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onAceitar} disabled={ocupado}><Check size={14} /> Aceitar</Button>
      <Button size="sm" variant="ghost" onClick={onRecusar} disabled={ocupado}><X size={14} /> Recusar</Button>
    </div>
  )
  return <Button size="sm" onClick={onSolicitar} disabled={ocupado}><UserPlus size={14} /> Adicionar amigo</Button>
}

function ConteudoPerfil({ conteudo, nome }: { conteudo: PublicContent; nome: string }) {
  const total =
    conteudo.planos.length + conteudo.sermoes.length + conteudo.esbocos.length + conteudo.anotacoes.length + conteudo.licoes.length

  if (total === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <span aria-hidden="true" className="empty-state__halo" />
        <span className="empty-state__icon"><Heart size={24} /></span>
        <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">{nome} ainda não publicou conteúdo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {conteudo.planos.length > 0 && (
        <Secao icon={BookOpen} titulo="Planos de leitura" contagem={conteudo.planos.length}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {conteudo.planos.map((plano) => (
              <Link key={plano.id} href={`/planos/${plano.id}`} className="surface panel-interactive block p-4">
                <p className="font-serif text-base font-semibold text-foreground">{plano.titulo}</p>
                {plano.descricao && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plano.descricao}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {plano.categoria && <Badge variant="default">{plano.categoria}</Badge>}
                  <Badge variant="outline">{plano.duracaoDias} dias</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Secao>
      )}

      {conteudo.sermoes.length > 0 && (
        <Secao icon={Mic} titulo="Sermões" contagem={conteudo.sermoes.length}>
          <PreviewGrid itens={conteudo.sermoes.map((s) => ({ id: s.id, titulo: s.titulo, sub: s.tema || s.textoBase, tag: s.categoria }))} />
        </Secao>
      )}

      {conteudo.esbocos.length > 0 && (
        <Secao icon={FileText} titulo="Esboços" contagem={conteudo.esbocos.length}>
          <PreviewGrid itens={conteudo.esbocos.map((e) => ({ id: e.id, titulo: e.titulo, sub: e.textoBase, tag: e.categoria }))} />
        </Secao>
      )}

      {conteudo.licoes.length > 0 && (
        <Secao icon={GraduationCap} titulo="Lições EBD" contagem={conteudo.licoes.length}>
          <PreviewGrid itens={conteudo.licoes.map((l) => ({ id: l.id, titulo: l.titulo, sub: l.textoBase, tag: null }))} />
        </Secao>
      )}

      {conteudo.anotacoes.length > 0 && (
        <Secao icon={PenTool} titulo="Anotações" contagem={conteudo.anotacoes.length}>
          <PreviewGrid itens={conteudo.anotacoes.map((a) => ({ id: a.id, titulo: a.titulo || 'Anotação', sub: a.referencia || a.livro, tag: null }))} />
        </Secao>
      )}
    </div>
  )
}

function Secao({ icon: Icon, titulo, contagem, children }: { icon: typeof Mic; titulo: string; contagem: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft text-primary"><Icon size={15} /></span>
        <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
        <Badge variant="outline">{contagem}</Badge>
      </div>
      {children}
    </section>
  )
}

function PreviewGrid({ itens }: { itens: Array<{ id: string; titulo: string; sub: string | null | undefined; tag: string | null | undefined }> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {itens.map((item) => (
        <div key={item.id} className="surface p-4">
          <p className="font-serif text-[15px] font-medium text-foreground">{item.titulo}</p>
          {item.sub && <p className="mt-1 line-clamp-2 text-sm text-scripture">{item.sub}</p>}
          {item.tag && <Badge variant="default" className="mt-2">{item.tag}</Badge>}
        </div>
      ))}
    </div>
  )
}
