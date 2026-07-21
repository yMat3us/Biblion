import 'server-only'

import { Prisma, UserRole } from '@prisma/client'
import type { z } from 'zod'
import { ApiErrors } from '@/lib/http'
import { prisma } from '@/lib/prisma'
import { destroyAllUserSessions, type AuthUser } from '@/lib/auth'
import { hashPassword, normalizeUsername, verifyPasswordHash } from '@/lib/password'
import { runById } from '@/lib/services/prisma-errors'
import type {
  accountCreateSchema,
  accountUpdateSchema,
  profileUpdateSchema,
} from '@/lib/validation'

type AccountCreateInput = z.infer<typeof accountCreateSchema>
type AccountUpdateInput = z.infer<typeof accountUpdateSchema>
type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  role: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  accentColor: true,
  locale: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

function ensureCanManage(actor: AuthUser, targetRole?: UserRole): void {
  if (actor.role === UserRole.OWNER) return
  if (actor.role === UserRole.ADMIN && (!targetRole || targetRole === UserRole.MEMBER)) return
  throw ApiErrors.forbidden('Você não tem permissão para gerenciar esta conta')
}

async function ensureOwnerContinuity(targetId: string, nextRole?: UserRole, nextActive?: boolean) {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, isActive: true },
  })
  if (!target) throw ApiErrors.notFound('Conta não encontrada')

  const removesActiveOwner =
    target.role === UserRole.OWNER &&
    target.isActive &&
    (nextRole !== undefined && nextRole !== UserRole.OWNER || nextActive === false)

  if (removesActiveOwner) {
    const primaryOwner = await prisma.user.findFirst({
      where: { role: UserRole.OWNER, isActive: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })
    if (!primaryOwner || primaryOwner.id === targetId) {
      throw ApiErrors.badRequest('O owner principal não pode ser rebaixado ou desativado')
    }
  }

  return target
}

async function removeObsoleteSessions(userId: string): Promise<void> {
  try {
    await destroyAllUserSessions(userId)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido'
    console.error(`[AUTH] Sessões invalidadas por versão, mas a limpeza física falhou: ${detail}`)
  }
}

export const UserService = {
  list: () => prisma.user.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'asc' }], select: USER_PUBLIC_SELECT }),

  getPublic: async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT })
    if (!user) throw ApiErrors.notFound('Conta não encontrada')
    return user
  },

  create: async (actor: AuthUser, input: AccountCreateInput) => {
    ensureCanManage(actor, input.role)
    if (actor.role === UserRole.ADMIN && input.role !== UserRole.MEMBER) {
      throw ApiErrors.forbidden('Administradores só podem criar membros')
    }

    try {
      return await prisma.user.create({
        data: {
          username: input.username.trim(),
          usernameNormalized: normalizeUsername(input.username),
          passwordHash: await hashPassword(input.password),
          displayName: input.displayName?.trim() || input.username.trim(),
          role: input.role,
        },
        select: USER_PUBLIC_SELECT,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw ApiErrors.badRequest('Este nome de usuário já está em uso')
      }
      throw error
    }
  },

  updateProfile: (userId: string, input: ProfileUpdateInput) =>
    prisma.user.update({
      where: { id: userId },
      data: {
        ...input,
        displayName: input.displayName?.trim(),
        bio: input.bio?.trim() || null,
        avatarUrl: input.avatarUrl?.trim() || null,
      },
      select: USER_PUBLIC_SELECT,
    }),

  updateAccount: async (actor: AuthUser, targetId: string, input: AccountUpdateInput) => {
    const target = await runById(
      () => ensureOwnerContinuity(targetId, input.role, input.isActive),
      'Conta não encontrada',
    )
    ensureCanManage(actor, target.role)
    ensureCanManage(actor, input.role)

    if (actor.id === targetId && input.isActive === false) {
      throw ApiErrors.badRequest('Você não pode desativar sua própria conta')
    }
    if (actor.role === UserRole.ADMIN && (target.role !== UserRole.MEMBER || input.role && input.role !== UserRole.MEMBER)) {
      throw ApiErrors.forbidden('Administradores só podem gerenciar membros')
    }

    const invalidatesSessions = input.isActive === false || Boolean(input.newPassword)
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        displayName: input.displayName?.trim(),
        role: input.role,
        isActive: input.isActive,
        passwordHash: input.newPassword ? await hashPassword(input.newPassword) : undefined,
        authVersion: invalidatesSessions ? { increment: 1 } : undefined,
      },
      select: USER_PUBLIC_SELECT,
    })

    if (invalidatesSessions) await removeObsoleteSessions(targetId)
    return updated
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })
    if (!user || !(await verifyPasswordHash(currentPassword, user.passwordHash))) {
      throw ApiErrors.unauthorized('Senha atual incorreta')
    }
    if (await verifyPasswordHash(newPassword, user.passwordHash)) {
      throw ApiErrors.badRequest('A nova senha deve ser diferente da senha atual')
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        authVersion: { increment: 1 },
      },
    })
    await removeObsoleteSessions(userId)
  },
}
