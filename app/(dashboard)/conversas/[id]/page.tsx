import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { ApiError } from '@/lib/http'
import { ChatService } from '@/lib/services/chat'
import { ThreadClient } from './ThreadClient'

export const dynamic = 'force-dynamic'

async function load(userId: string, conversationId: string) {
  try {
    return await ChatService.getConversation(userId, conversationId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser()
  const { id } = await params
  const { outro, mensagens } = await load(user.id, id)

  return (
    <ThreadClient
      conversaId={id}
      outro={outro}
      mensagensIniciais={mensagens.map((mensagem) => ({
        id: mensagem.id,
        corpo: mensagem.corpo,
        minha: mensagem.minha,
        removida: mensagem.removida,
        createdAt: mensagem.createdAt.toISOString(),
      }))}
    />
  )
}
