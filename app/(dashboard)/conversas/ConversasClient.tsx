'use client'

import Link from 'next/link'
import { MessageCircle, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { buttonStyles } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ChatUser {
  id: string
  publicId: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface ConversaItem {
  id: string
  outro: ChatUser | null
  naoLida: boolean
  ultimaMensagem: { corpo: string | null; minha: boolean; createdAt: string } | null
}

function horario(iso: string): string {
  const data = new Date(iso)
  const hoje = new Date()
  const mesmoDia = data.toDateString() === hoje.toDateString()
  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function ConversasClient({ conversas }: { conversas: ConversaItem[] }) {
  return (
    <WorkspacePage archetype="cabinet" size="compact">
      <PageHeader
        variant="cabinet"
        index="Mensagens"
        eyebrow="Comunhão"
        title="Conversas"
        description="Converse com amigos de forma reservada e respeitosa. As mensagens são privadas entre vocês."
      />

      {conversas.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true" className="empty-state__halo" />
          <span className="empty-state__icon"><MessageCircle size={26} /></span>
          <h2 className="mt-5 text-lg font-semibold text-foreground">Nenhuma conversa ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Abra o perfil de um amigo e toque em “Enviar mensagem” para começar.</p>
          <Link href="/amigos" className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-6' })}>
            <UsersRound size={15} /> Ver amigos
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversas.map((conversa) => {
            const nome = conversa.outro?.displayName || conversa.outro?.username || 'Conversa'
            const preview = conversa.ultimaMensagem
              ? conversa.ultimaMensagem.corpo === null
                ? 'Mensagem removida'
                : `${conversa.ultimaMensagem.minha ? 'Você: ' : ''}${conversa.ultimaMensagem.corpo}`
              : 'Iniciem a conversa'
            return (
              <li key={conversa.id}>
                <Link
                  href={`/conversas/${conversa.id}`}
                  className="surface panel-interactive flex items-center gap-3 p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft bg-cover bg-center font-semibold text-primary"
                    style={conversa.outro?.avatarUrl ? { backgroundImage: `url(${JSON.stringify(conversa.outro.avatarUrl)})` } : undefined}
                  >
                    {!conversa.outro?.avatarUrl && nome.charAt(0).toLocaleUpperCase('pt-BR')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate', conversa.naoLida ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>{nome}</span>
                      {conversa.ultimaMensagem && <span className="shrink-0 text-[11px] text-subtle">{horario(conversa.ultimaMensagem.createdAt)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm', conversa.naoLida ? 'text-foreground' : 'text-muted-foreground')}>{preview}</span>
                      {conversa.naoLida && <span aria-label="Não lida" className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </WorkspacePage>
  )
}
