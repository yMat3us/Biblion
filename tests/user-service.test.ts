import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@prisma/client'
import type { AuthUser } from '@/lib/auth'

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  destroyAllUserSessions: vi.fn(),
  hashPassword: vi.fn(),
  normalizeUsername: vi.fn(),
  verifyPasswordHash: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/auth', () => ({ destroyAllUserSessions: mocks.destroyAllUserSessions }))
vi.mock('@/lib/password', () => ({
  hashPassword: mocks.hashPassword,
  normalizeUsername: mocks.normalizeUsername,
  verifyPasswordHash: mocks.verifyPasswordHash,
}))

import { UserService } from '@/lib/services/user'

function actor(role: UserRole, id = 'actor-1'): AuthUser {
  return {
    id,
    username: 'actor',
    role,
    displayName: 'Actor',
    bio: null,
    avatarUrl: null,
    accentColor: 'violet',
    locale: 'pt-BR',
    publicId: 'abcdefgh2345',
    isSearchable: true,
    profileVisibility: 'PUBLIC',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('account RBAC and session revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hashPassword.mockResolvedValue('secure-hash')
    mocks.normalizeUsername.mockImplementation((value: string) => value.trim().toLowerCase())
    mocks.destroyAllUserSessions.mockResolvedValue(undefined)
    mocks.prisma.user.create.mockResolvedValue({ id: 'new-user' })
    mocks.prisma.user.update.mockResolvedValue({ id: 'target-1' })
  })

  it('prevents an ADMIN from creating another privileged account', async () => {
    await expect(UserService.create(actor(UserRole.ADMIN), {
      username: 'second-admin',
      password: 'Senha segura 123!',
      role: UserRole.ADMIN,
    })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })

    expect(mocks.hashPassword).not.toHaveBeenCalled()
    expect(mocks.prisma.user.create).not.toHaveBeenCalled()
  })

  it('allows an ADMIN to create a MEMBER with server-side normalization and hashing', async () => {
    await UserService.create(actor(UserRole.ADMIN), {
      username: '  Member.One  ',
      password: 'Senha segura 123!',
      displayName: '  Membro Um  ',
      role: UserRole.MEMBER,
    })

    expect(mocks.prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        username: 'Member.One',
        usernameNormalized: 'member.one',
        passwordHash: 'secure-hash',
        displayName: 'Membro Um',
        role: UserRole.MEMBER,
      }),
    }))
  })

  it('keeps the primary OWNER immutable even when other owners exist', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER, isActive: true })
    mocks.prisma.user.findFirst.mockResolvedValueOnce({ id: 'owner-primary' })

    await expect(UserService.updateAccount(actor(UserRole.OWNER), 'owner-primary', {
      isActive: false,
    })).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' })

    expect(mocks.prisma.user.update).not.toHaveBeenCalled()
  })

  it('allows a non-primary OWNER to be deactivated without risking zero owners', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER, isActive: true })
    mocks.prisma.user.findFirst.mockResolvedValueOnce({ id: 'owner-primary' })

    await UserService.updateAccount(actor(UserRole.OWNER), 'owner-secondary', { isActive: false })

    expect(mocks.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ authVersion: { increment: 1 }, isActive: false }),
    }))
    expect(mocks.destroyAllUserSessions).toHaveBeenCalledWith('owner-secondary')
  })

  it('prevents an ADMIN from modifying an OWNER', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ role: UserRole.OWNER, isActive: true })

    await expect(UserService.updateAccount(actor(UserRole.ADMIN), 'owner-1', {
      displayName: 'Tentativa',
    })).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
  })

  it('revokes sessions when an OWNER deactivates a MEMBER', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ role: UserRole.MEMBER, isActive: true })

    await UserService.updateAccount(actor(UserRole.OWNER), 'member-1', { isActive: false })

    expect(mocks.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ authVersion: { increment: 1 }, isActive: false }),
    }))
    expect(mocks.destroyAllUserSessions).toHaveBeenCalledWith('member-1')
  })

  it('changes a valid password, increments authVersion and removes existing sessions', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'old-hash' })
    mocks.verifyPasswordHash
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    await UserService.changePassword('user-1', 'Senha antiga 123!', 'Senha nova 456!')

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'secure-hash',
        authVersion: { increment: 1 },
      },
    })
    expect(mocks.destroyAllUserSessions).toHaveBeenCalledWith('user-1')
  })

  it('keeps old sessions invalid when their physical cleanup fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'old-hash' })
    mocks.verifyPasswordHash
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    mocks.destroyAllUserSessions.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(UserService.changePassword('user-1', 'Senha antiga 123!', 'Senha nova 456!'))
      .resolves.toBeUndefined()
    expect(mocks.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ authVersion: { increment: 1 } }),
    }))
    expect(consoleError).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })
})
