import { NotificationType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cached, cacheDel } from '@/lib/redis'

const ACTOR_SELECT = {
  id: true,
  publicId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

// Contagem de não lidas é lida com frequência (poll do sino + rota). Cacheamos
// por poucos segundos e invalidamos em toda mutação (criação/leitura) para manter
// a correção. TTL curto é rede de segurança caso uma invalidação escape.
const UNREAD_TTL_SECONDS = 15
const unreadKey = (userId: string) => `unread:v1:${userId}`

/**
 * Criação de notificações. Estes métodos LANÇAM em caso de falha — são chamados
 * pelo processador do outbox (lib/events/outbox), que reentrega com backoff.
 */
export const NotificationService = {
  createFriendRequest: async (recipientId: string, actorId: string): Promise<void> => {
    await prisma.notification.create({
      data: { userId: recipientId, type: NotificationType.FRIEND_REQUEST, actorId },
    })
    await cacheDel(unreadKey(recipientId))
  },

  createFriendAccepted: async (recipientId: string, actorId: string): Promise<void> => {
    await prisma.notification.create({
      data: { userId: recipientId, type: NotificationType.FRIEND_ACCEPTED, actorId },
    })
    await cacheDel(unreadKey(recipientId))
  },

  /** Coalesce notificações de mensagem por conversa: uma não-lida por conversa. */
  createMessage: async (recipientId: string, actorId: string, conversationId: string): Promise<void> => {
    const existing = await prisma.notification.findFirst({
      where: { userId: recipientId, type: NotificationType.MESSAGE, payload: conversationId, readAt: null },
      select: { id: true },
    })
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: { createdAt: new Date(), actorId } })
    } else {
      await prisma.notification.create({
        data: { userId: recipientId, type: NotificationType.MESSAGE, actorId, payload: conversationId },
      })
    }
    await cacheDel(unreadKey(recipientId))
  },

  list: (userId: string) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, payload: true, readAt: true, createdAt: true, actor: { select: ACTOR_SELECT } },
    }),

  unreadCount: (userId: string): Promise<number> =>
    cached(unreadKey(userId), UNREAD_TTL_SECONDS, () =>
      prisma.notification.count({ where: { userId, readAt: null } }),
    ),

  /** Invalida o cache de não lidas do usuário (usado após ler mensagens no chat). */
  invalidateUnread: (userId: string) => cacheDel(unreadKey(userId)),

  markRead: async (userId: string, id?: string) => {
    await prisma.notification.updateMany({
      where: id ? { id, userId, readAt: null } : { userId, readAt: null },
      data: { readAt: new Date() },
    })
    await cacheDel(unreadKey(userId))
    return { unread: await prisma.notification.count({ where: { userId, readAt: null } }) }
  },
}
