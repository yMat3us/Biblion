import { NotificationType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const ACTOR_SELECT = {
  id: true,
  publicId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

/**
 * Notificações são "best-effort": uma falha ao notificar nunca deve derrubar a
 * ação principal (aceitar amizade, enviar mensagem). Por isso os `notify*`
 * engolem erros e apenas registram no log.
 */
async function safeCreate(data: Prisma.NotificationUncheckedCreateInput): Promise<void> {
  try {
    await prisma.notification.create({ data })
  } catch (error) {
    console.error('[NOTIFICATION] Falha ao criar notificação:', error instanceof Error ? error.message : error)
  }
}

export const NotificationService = {
  notifyFriendRequest: (recipientId: string, actorId: string) =>
    safeCreate({ userId: recipientId, type: NotificationType.FRIEND_REQUEST, actorId }),

  notifyFriendAccepted: (recipientId: string, actorId: string) =>
    safeCreate({ userId: recipientId, type: NotificationType.FRIEND_ACCEPTED, actorId }),

  /** Coalesce notificações de mensagem por conversa: uma não-lida por conversa. */
  notifyMessage: async (recipientId: string, actorId: string, conversationId: string): Promise<void> => {
    try {
      const existing = await prisma.notification.findFirst({
        where: { userId: recipientId, type: NotificationType.MESSAGE, payload: conversationId, readAt: null },
        select: { id: true },
      })
      if (existing) {
        await prisma.notification.update({ where: { id: existing.id }, data: { createdAt: new Date(), actorId } })
        return
      }
      await prisma.notification.create({
        data: { userId: recipientId, type: NotificationType.MESSAGE, actorId, payload: conversationId },
      })
    } catch (error) {
      console.error('[NOTIFICATION] Falha ao notificar mensagem:', error instanceof Error ? error.message : error)
    }
  },

  list: (userId: string) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, payload: true, readAt: true, createdAt: true, actor: { select: ACTOR_SELECT } },
    }),

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),

  markRead: async (userId: string, id?: string) => {
    await prisma.notification.updateMany({
      where: id ? { id, userId, readAt: null } : { userId, readAt: null },
      data: { readAt: new Date() },
    })
    return { unread: await prisma.notification.count({ where: { userId, readAt: null } }) }
  },
}
