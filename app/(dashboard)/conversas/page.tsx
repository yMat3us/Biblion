import { requirePageUser } from '@/lib/auth-page'
import { ChatService } from '@/lib/services/chat'
import { ConversasClient } from './ConversasClient'

export const dynamic = 'force-dynamic'

export default async function ConversasPage() {
  const user = await requirePageUser()
  const conversas = await ChatService.listConversations(user.id)

  return (
    <ConversasClient
      conversas={conversas.map((conversa) => ({
        id: conversa.id,
        outro: conversa.outro,
        naoLida: conversa.naoLida,
        ultimaMensagem: conversa.ultimaMensagem
          ? {
              corpo: conversa.ultimaMensagem.corpo,
              minha: conversa.ultimaMensagem.minha,
              createdAt: conversa.ultimaMensagem.createdAt.toISOString(),
            }
          : null,
      }))}
    />
  )
}
