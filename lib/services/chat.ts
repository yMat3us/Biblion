import { NotificationType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import { SocialService } from '@/lib/services/social'
import { NotificationService } from '@/lib/services/notification'

const CHAT_USER_SELECT = {
  id: true,
  publicId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

const MESSAGE_SELECT = {
  id: true,
  corpo: true,
  senderId: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.MessageSelect

type MessageRow = Prisma.MessageGetPayload<{ select: typeof MESSAGE_SELECT }>

function messageDTO(userId: string, message: MessageRow) {
  const removida = Boolean(message.deletedAt)
  return {
    id: message.id,
    corpo: removida ? null : message.corpo,
    minha: message.senderId === userId,
    removida,
    createdAt: message.createdAt,
  }
}

async function assertParticipant(userId: string, conversationId: string) {
  const participant = await runById(
    () =>
      prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { id: true },
      }),
    'Conversa não encontrada',
  )
  if (!participant) throw ApiErrors.notFound('Conversa não encontrada')
  return participant
}

async function otherParticipantId(conversationId: string, userId: string) {
  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  })
  return other?.userId ?? null
}

export const ChatService = {
  listConversations: async (userId: string) => {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      select: {
        id: true,
        lastMessageAt: true,
        participants: { select: { userId: true, lastReadAt: true, user: { select: CHAT_USER_SELECT } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: MESSAGE_SELECT },
      },
    })

    return conversations
      .map((conversation) => {
        const eu = conversation.participants.find((participant) => participant.userId === userId)
        const outro = conversation.participants.find((participant) => participant.userId !== userId)?.user ?? null
        const ultima = conversation.messages[0] ?? null
        const naoLida = Boolean(
          ultima && ultima.senderId !== userId && (!eu?.lastReadAt || ultima.createdAt > eu.lastReadAt),
        )
        return {
          id: conversation.id,
          outro,
          ultimaMensagem: ultima
            ? { corpo: ultima.deletedAt ? null : ultima.corpo, createdAt: ultima.createdAt, minha: ultima.senderId === userId }
            : null,
          naoLida,
        }
      })
      .filter((conversation) => conversation.outro !== null)
  },

  getOrCreateConversation: async (userId: string, otherId: string) => {
    if (userId === otherId) throw ApiErrors.badRequest('Conversa inválida')
    const other = await runById(
      () => prisma.user.findFirst({ where: { id: otherId, isActive: true }, select: { id: true } }),
      'Usuário não encontrado',
    )
    if (!other) throw ApiErrors.notFound('Usuário não encontrado')
    if (await SocialService.isBlockedBetween(userId, otherId)) throw ApiErrors.notFound('Usuário não encontrado')
    if (!(await SocialService.areFriends(userId, otherId))) {
      throw ApiErrors.forbidden('Vocês precisam ser amigos para iniciar uma conversa')
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: otherId } } }],
      },
      select: { id: true },
    })
    if (existing) return { id: existing.id }

    const created = await prisma.conversation.create({
      data: { isGroup: false, participants: { create: [{ userId }, { userId: otherId }] } },
      select: { id: true },
    })
    return { id: created.id }
  },

  getConversation: async (userId: string, conversationId: string) => {
    await assertParticipant(userId, conversationId)
    const [outro, mensagens] = await Promise.all([
      prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: userId } },
        select: { user: { select: CHAT_USER_SELECT } },
      }),
      prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 50, select: MESSAGE_SELECT }),
    ])
    return {
      outro: outro?.user ?? null,
      mensagens: mensagens.reverse().map((message) => messageDTO(userId, message)),
    }
  },

  messagesSince: async (userId: string, conversationId: string, since: string) => {
    await assertParticipant(userId, conversationId)
    const mensagens = await prisma.message.findMany({
      where: { conversationId, createdAt: { gt: new Date(since) } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: MESSAGE_SELECT,
    })
    return { mensagens: mensagens.map((message) => messageDTO(userId, message)) }
  },

  sendMessage: async (userId: string, conversationId: string, corpo: string) => {
    await assertParticipant(userId, conversationId)
    const outroId = await otherParticipantId(conversationId, userId)
    if (!outroId) throw ApiErrors.notFound('Conversa não encontrada')
    if (await SocialService.isBlockedBetween(userId, outroId)) {
      throw ApiErrors.forbidden('Não é possível enviar mensagens a este usuário')
    }
    if (!(await SocialService.areFriends(userId, outroId))) {
      throw ApiErrors.forbidden('Vocês não são mais amigos')
    }

    const now = new Date()
    const message = await prisma.message.create({ data: { conversationId, senderId: userId, corpo }, select: MESSAGE_SELECT })
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } })
    await prisma.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: now } })
    await NotificationService.notifyMessage(outroId, userId, conversationId)

    return messageDTO(userId, message)
  },

  markRead: async (userId: string, conversationId: string) => {
    await prisma.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } })
    await prisma.notification.updateMany({
      where: { userId, type: NotificationType.MESSAGE, payload: conversationId, readAt: null },
      data: { readAt: new Date() },
    })
    return { success: true }
  },

  deleteMessage: async (userId: string, conversationId: string, messageId: string) => {
    const result = await runById(
      () =>
        prisma.message.updateMany({
          where: { id: messageId, conversationId, senderId: userId, deletedAt: null },
          data: { deletedAt: new Date() },
        }),
      'Mensagem não encontrada',
    )
    if (result.count === 0) throw ApiErrors.notFound('Mensagem não encontrada')
    return { success: true }
  },
}
