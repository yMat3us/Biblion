import { FriendshipStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import { NotificationService } from '@/lib/services/notification'

export type RelationshipStatus =
  | 'self'
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friends'
  | 'blocked'
  | 'blocked_by'

const PUBLIC_USER_SELECT = {
  id: true,
  publicId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>

async function blockBetween(a: string, b: string) {
  return prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
    select: { blockerId: true },
  })
}

async function friendshipBetween(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: { OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] },
    select: { id: true, requesterId: true, status: true },
  })
}

export const SocialService = {
  areFriends: async (a: string, b: string): Promise<boolean> => {
    if (a === b) return false
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }],
      },
      select: { id: true },
    })
    return Boolean(friendship)
  },

  isBlockedBetween: async (a: string, b: string): Promise<boolean> => {
    if (a === b) return false
    return Boolean(await blockBetween(a, b))
  },

  relationship: async (me: string, otherId: string): Promise<RelationshipStatus> => {
    if (me === otherId) return 'self'
    const block = await blockBetween(me, otherId)
    if (block) return block.blockerId === me ? 'blocked' : 'blocked_by'
    const friendship = await friendshipBetween(me, otherId)
    if (!friendship) return 'none'
    if (friendship.status === FriendshipStatus.ACCEPTED) return 'friends'
    return friendship.requesterId === me ? 'pending_sent' : 'pending_received'
  },

  search: async (me: string, q: string) => {
    const termo = q.trim()
    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        isSearchable: true,
        id: { not: me },
        OR: [
          { username: { contains: termo, mode: 'insensitive' } },
          { displayName: { contains: termo, mode: 'insensitive' } },
          { publicId: termo.toLocaleLowerCase('en-US') },
        ],
      },
      orderBy: { username: 'asc' },
      take: 20,
      select: PUBLIC_USER_SELECT,
    })

    const ids = candidates.map((candidate) => candidate.id)
    if (ids.length === 0) return []

    const [blocks, friendships] = await Promise.all([
      prisma.block.findMany({
        where: { OR: [{ blockerId: me, blockedId: { in: ids } }, { blockedId: me, blockerId: { in: ids } }] },
        select: { blockerId: true, blockedId: true },
      }),
      prisma.friendship.findMany({
        where: { OR: [{ requesterId: me, addresseeId: { in: ids } }, { addresseeId: me, requesterId: { in: ids } }] },
        select: { requesterId: true, addresseeId: true, status: true },
      }),
    ])

    const blockedIds = new Set(blocks.map((block) => (block.blockerId === me ? block.blockedId : block.blockerId)))
    const statusById = new Map<string, RelationshipStatus>()
    for (const friendship of friendships) {
      const other = friendship.requesterId === me ? friendship.addresseeId : friendship.requesterId
      statusById.set(
        other,
        friendship.status === FriendshipStatus.ACCEPTED
          ? 'friends'
          : friendship.requesterId === me
            ? 'pending_sent'
            : 'pending_received',
      )
    }

    return candidates
      .filter((candidate) => !blockedIds.has(candidate.id))
      .map((candidate) => ({ ...candidate, status: statusById.get(candidate.id) ?? ('none' as RelationshipStatus) }))
  },

  sendRequest: async (me: string, alvoId: string) => {
    if (me === alvoId) throw ApiErrors.badRequest('Você não pode adicionar a si mesmo')
    const target = await runById(
      () => prisma.user.findFirst({ where: { id: alvoId, isActive: true }, select: { id: true } }),
      'Usuário não encontrado',
    )
    if (!target) throw ApiErrors.notFound('Usuário não encontrado')
    // Bloqueio (em qualquer direção) esconde o alvo: resposta genérica, sem vazar o bloqueio.
    if (await blockBetween(me, alvoId)) throw ApiErrors.notFound('Usuário não encontrado')

    const existing = await friendshipBetween(me, alvoId)
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) return { status: 'friends' as RelationshipStatus }
      if (existing.requesterId === me) return { status: 'pending_sent' as RelationshipStatus }
      // O alvo já havia me enviado uma solicitação → aceite mútuo automático.
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.ACCEPTED, respondedAt: new Date() },
      })
      await NotificationService.notifyFriendAccepted(alvoId, me)
      return { status: 'friends' as RelationshipStatus }
    }

    await prisma.friendship.create({ data: { requesterId: me, addresseeId: alvoId, status: FriendshipStatus.PENDING } })
    await NotificationService.notifyFriendRequest(alvoId, me)
    return { status: 'pending_sent' as RelationshipStatus }
  },

  respond: async (me: string, solicitanteId: string, aceitar: boolean) => {
    const request = await runById(
      () =>
        prisma.friendship.findFirst({
          where: { requesterId: solicitanteId, addresseeId: me, status: FriendshipStatus.PENDING },
          select: { id: true },
        }),
      'Solicitação não encontrada',
    )
    if (!request) throw ApiErrors.notFound('Solicitação não encontrada')

    if (aceitar) {
      await prisma.friendship.update({
        where: { id: request.id },
        data: { status: FriendshipStatus.ACCEPTED, respondedAt: new Date() },
      })
      await NotificationService.notifyFriendAccepted(solicitanteId, me)
      return { status: 'friends' as RelationshipStatus }
    }
    await prisma.friendship.delete({ where: { id: request.id } })
    return { status: 'none' as RelationshipStatus }
  },

  removeFriend: async (me: string, alvoId: string) => {
    const friendship = await friendshipBetween(me, alvoId)
    if (friendship) await prisma.friendship.delete({ where: { id: friendship.id } })
    return { status: 'none' as RelationshipStatus }
  },

  setBlock: async (me: string, alvoId: string, bloquear: boolean) => {
    if (me === alvoId) throw ApiErrors.badRequest('Ação inválida')
    if (bloquear) {
      const friendship = await friendshipBetween(me, alvoId)
      if (friendship) await prisma.friendship.delete({ where: { id: friendship.id } })
      await prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: me, blockedId: alvoId } },
        update: {},
        create: { blockerId: me, blockedId: alvoId },
      })
      return { status: 'blocked' as RelationshipStatus }
    }
    await prisma.block.deleteMany({ where: { blockerId: me, blockedId: alvoId } })
    return { status: 'none' as RelationshipStatus }
  },

  listFriends: async (me: string) => {
    const rows = await prisma.friendship.findMany({
      where: { status: FriendshipStatus.ACCEPTED, OR: [{ requesterId: me }, { addresseeId: me }] },
      orderBy: { respondedAt: 'desc' },
      select: {
        requesterId: true,
        requester: { select: PUBLIC_USER_SELECT },
        addressee: { select: PUBLIC_USER_SELECT },
      },
    })
    return rows.map((row) => ({ ...(row.requesterId === me ? row.addressee : row.requester), status: 'friends' as RelationshipStatus }))
  },

  listPendingReceived: async (me: string) => {
    const rows = await prisma.friendship.findMany({
      where: { status: FriendshipStatus.PENDING, addresseeId: me },
      orderBy: { createdAt: 'desc' },
      select: { requester: { select: PUBLIC_USER_SELECT } },
    })
    return rows.map((row) => ({ ...row.requester, status: 'pending_received' as RelationshipStatus }))
  },

  listPendingSent: async (me: string) => {
    const rows = await prisma.friendship.findMany({
      where: { status: FriendshipStatus.PENDING, requesterId: me },
      orderBy: { createdAt: 'desc' },
      select: { addressee: { select: PUBLIC_USER_SELECT } },
    })
    return rows.map((row) => ({ ...row.addressee, status: 'pending_sent' as RelationshipStatus }))
  },
}
