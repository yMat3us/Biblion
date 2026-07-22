'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, MailOpen, MessageCircle, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Actor {
  id: string
  publicId: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface Notificacao {
  id: string
  type: string
  payload: string | null
  lida: boolean
  createdAt: string
  actor: Actor | null
}

function textoNotificacao(n: Notificacao): string {
  const nome = n.actor?.displayName || n.actor?.username || 'Alguém'
  switch (n.type) {
    case 'FRIEND_REQUEST':
      return `${nome} enviou uma solicitação de amizade.`
    case 'FRIEND_ACCEPTED':
      return `${nome} aceitou sua solicitação de amizade.`
    case 'MESSAGE':
      return `${nome} enviou uma mensagem.`
    default:
      return 'Você tem uma nova notificação.'
  }
}

function destino(n: Notificacao): string {
  if (n.type === 'MESSAGE' && n.payload) return `/conversas/${n.payload}`
  if (n.type === 'FRIEND_REQUEST') return '/amigos'
  if (n.type === 'FRIEND_ACCEPTED' && n.actor?.publicId) return `/u/${n.actor.publicId}`
  return '/notificacoes'
}

function IconePorTipo({ type }: { type: string }) {
  if (type === 'MESSAGE') return <MessageCircle size={15} />
  if (type === 'FRIEND_REQUEST' || type === 'FRIEND_ACCEPTED') return <UserPlus size={15} />
  return <Bell size={15} />
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function NotificacoesClient({ notificacoesIniciais }: { notificacoesIniciais: Notificacao[] }) {
  const [notificacoes, setNotificacoes] = useState(notificacoesIniciais)
  const temNaoLidas = notificacoes.some((n) => !n.lida)

  async function marcarUma(id: string) {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
    void fetch('/api/notificacoes/ler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  }

  async function marcarTodas() {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    void fetch('/api/notificacoes/ler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => undefined)
  }

  return (
    <WorkspacePage archetype="cabinet" size="compact">
      <PageHeader
        variant="cabinet"
        index="Avisos"
        eyebrow="Sua comunidade"
        title="Notificações"
        description="Solicitações de amizade e mensagens recentes."
        action={
          temNaoLidas ? (
            <Button variant="outline" size="sm" onClick={marcarTodas}>
              <MailOpen size={15} /> Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      {notificacoes.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <span aria-hidden="true" className="empty-state__halo" />
          <span className="empty-state__icon"><Bell size={26} /></span>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notificacoes.map((n) => {
            const nome = n.actor?.displayName || n.actor?.username || 'Sistema'
            return (
              <li key={n.id}>
                <Link
                  href={destino(n)}
                  onClick={() => !n.lida && marcarUma(n.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-3.5 transition-colors',
                    n.lida ? 'border-hairline bg-surface/50 hover:bg-elevated/50' : 'border-primary/30 bg-primary-soft/40 hover:bg-primary-soft/60',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft bg-cover bg-center text-primary"
                    style={n.actor?.avatarUrl ? { backgroundImage: `url(${JSON.stringify(n.actor.avatarUrl)})` } : undefined}
                  >
                    {!n.actor?.avatarUrl && <IconePorTipo type={n.type} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', n.lida ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                      {textoNotificacao({ ...n, actor: n.actor ? { ...n.actor, displayName: nome } : n.actor })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-subtle">{tempoRelativo(n.createdAt)}</p>
                  </div>
                  {!n.lida && <span aria-label="Não lida" className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </WorkspacePage>
  )
}
