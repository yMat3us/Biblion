import 'server-only'

import { randomBytes } from 'node:crypto'
import { Prisma, UserRole, Visibility } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { logger } from '@/lib/logger'
import { verifyPasswordHash } from '@/lib/password'

/**
 * Exclusão de conta pelo titular (LGPD, direito de eliminação). Em vez de apagar
 * o registro do usuário (o que quebraria a integridade referencial de conversas
 * alheias), ANONIMIZAMOS: a PII é zerada, o conteúdo próprio é apagado, o grafo
 * social e as sessões são removidos, e o conteúdo das mensagens é apagado
 * (preservando a estrutura da conversa do outro participante).
 *
 * Tudo em uma transação, em ordem de dependência. Requer replica set (Atlas
 * atende); ambientes de dev com Mongo single-node não suportam transação
 * interativa — limitação conhecida do MongoDB.
 */
async function purgeAndAnonymize(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const now = new Date()

  // 1. Conteúdo próprio do titular.
  await tx.sermao.deleteMany({ where: { ownerId: userId } })
  await tx.esboco.deleteMany({ where: { ownerId: userId } })
  await tx.anotacao.deleteMany({ where: { ownerId: userId } })
  await tx.favorito.deleteMany({ where: { ownerId: userId } })
  await tx.licaoEBD.deleteMany({ where: { ownerId: userId } })
  await tx.revistaEBD.deleteMany({ where: { ownerId: userId } })
  await tx.configuracao.deleteMany({ where: { ownerId: userId } })
  await tx.planEnrollment.deleteMany({ where: { userId } })
  await tx.readingPlan.deleteMany({ where: { ownerId: userId } })

  // 2. Grafo social (amizades e bloqueios em qualquer direção).
  await tx.friendship.deleteMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } })
  await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } })

  // 3. Notificações (como destinatário e como ator).
  await tx.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } })

  // 4. Mensagens: apaga o conteúdo (LGPD) mas mantém a linha (a conversa do outro
  //    participante continua íntegra; as mensagens aparecem como "removida").
  await tx.message.updateMany({ where: { senderId: userId }, data: { corpo: '', deletedAt: now } })

  // 5. Sessões (revoga todos os dispositivos).
  await tx.userSession.deleteMany({ where: { userId } })

  // 6. Anonimiza o usuário: PII zerada, conta desativada e inacessível.
  const tombstone = `deleted_${randomBytes(8).toString('hex')}`
  await tx.user.update({
    where: { id: userId },
    data: {
      username: tombstone,
      usernameNormalized: tombstone,
      displayName: 'Usuário removido',
      bio: null,
      avatarUrl: null,
      passwordHash: randomBytes(32).toString('hex'), // formato inválido → login impossível
      publicId: null,
      isSearchable: false,
      profileVisibility: Visibility.PRIVATE,
      accentColor: 'violet',
      locale: 'pt-BR',
      isActive: false,
      authVersion: { increment: 1 }, // invalida qualquer sessão remanescente
      deletedAt: now,
    },
  })
}

export const AccountService = {
  /**
   * Exclui (anonimiza) a própria conta após reautenticação por senha. O último
   * owner ativo não pode se autoexcluir — preserva a continuidade administrativa.
   */
  deleteAccount: async (userId: string, currentPassword: string): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, role: true, isActive: true },
    })
    if (!user || !user.isActive) throw ApiErrors.notFound('Conta não encontrada')

    if (!(await verifyPasswordHash(currentPassword, user.passwordHash))) {
      throw ApiErrors.unauthorized('Senha incorreta')
    }

    if (user.role === UserRole.OWNER) {
      const anotherOwner = await prisma.user.findFirst({
        where: { role: UserRole.OWNER, isActive: true, id: { not: userId } },
        select: { id: true },
      })
      if (!anotherOwner) throw ApiErrors.badRequest('O owner principal não pode excluir a própria conta')
    }

    await prisma.$transaction((tx) => purgeAndAnonymize(tx, userId))
    logger.info('account_deleted', { userId })
  },
}
