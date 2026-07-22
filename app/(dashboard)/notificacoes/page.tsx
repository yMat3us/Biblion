import { requirePageUser } from '@/lib/auth-page'
import { NotificationService } from '@/lib/services/notification'
import { NotificacoesClient } from './NotificacoesClient'

export const dynamic = 'force-dynamic'

export default async function NotificacoesPage() {
  const user = await requirePageUser()
  const notificacoes = await NotificationService.list(user.id)

  return (
    <NotificacoesClient
      notificacoesIniciais={notificacoes.map((n) => ({
        id: n.id,
        type: n.type,
        payload: n.payload,
        lida: Boolean(n.readAt),
        createdAt: n.createdAt.toISOString(),
        actor: n.actor,
      }))}
    />
  )
}
