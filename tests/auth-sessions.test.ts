import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const prisma = vi.hoisted(() => ({
  userSession: { findMany: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { listUserSessions, destroyAllUserSessions, resolveSessionToken } from '@/lib/auth'
import { SESSION_ABSOLUTE_TTL_MS, SESSION_IDLE_TTL_MS } from '@/lib/auth-constants'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const CHROME_LINUX = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0 Safari/537.36'

function buildSessionRow(overrides: Record<string, unknown> = {}) {
  const now = Date.now()
  return {
    id: 's1',
    authVersion: 1,
    expiresAt: new Date(now + SESSION_IDLE_TTL_MS),
    lastSeenAt: new Date(now),
    createdAt: new Date(now),
    userAgent: CHROME_LINUX,
    user: {
      id: 'u1', username: 'ana', role: 'MEMBER', displayName: 'Ana', bio: null,
      accentColor: 'violet', locale: 'pt-BR', publicId: 'anapublicid1', isSearchable: false,
      profileVisibility: 'FRIENDS', isActive: true,
      createdAt: new Date(now), updatedAt: new Date(now), authVersion: 1,
    },
    ...overrides,
  }
}

describe('listUserSessions — DTO seguro de dispositivos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marca a sessão atual e nunca expõe tokenHash', async () => {
    const now = new Date()
    prisma.userSession.findMany.mockResolvedValueOnce([
      { id: 's1', userAgent: 'Chrome', createdAt: now, lastSeenAt: now, expiresAt: now, tokenHash: sha256('token-atual') },
      { id: 's2', userAgent: 'Firefox', createdAt: now, lastSeenAt: now, expiresAt: now, tokenHash: sha256('outro-token') },
    ])

    const result = await listUserSessions('u1', 'token-atual')

    expect(result).toEqual([
      { id: 's1', userAgent: 'Chrome', createdAt: now, lastSeenAt: now, expiresAt: now, current: true },
      { id: 's2', userAgent: 'Firefox', createdAt: now, lastSeenAt: now, expiresAt: now, current: false },
    ])
    // Nenhum campo interno deve vazar no DTO.
    expect(result.every((session) => !('tokenHash' in session))).toBe(true)
    // Só sessões ativas (não expiradas) do próprio usuário.
    expect(prisma.userSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', expiresAt: { gt: expect.any(Date) } }) }),
    )
  })

  it('não marca nenhuma sessão como atual quando não há token', async () => {
    const now = new Date()
    prisma.userSession.findMany.mockResolvedValueOnce([
      { id: 's1', userAgent: null, createdAt: now, lastSeenAt: now, expiresAt: now, tokenHash: sha256('x') },
    ])

    const result = await listUserSessions('u1', undefined)
    expect(result[0].current).toBe(false)
  })
})

describe('destroyAllUserSessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('revoga todas as sessões do usuário', async () => {
    prisma.userSession.deleteMany.mockResolvedValueOnce({ count: 3 })
    await destroyAllUserSessions('u1')
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })
})

const TOKEN = 'opaque-session-token'

describe('resolveSessionToken — hardening (idle, teto absoluto, rotação de UA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.userSession.delete.mockResolvedValue({})
    prisma.userSession.update.mockResolvedValue({})
  })

  it('resolve uma sessão válida dentro das janelas', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(buildSessionRow())
    const user = await resolveSessionToken(TOKEN, CHROME_LINUX)
    expect(user?.id).toBe('u1')
    expect(prisma.userSession.delete).not.toHaveBeenCalled()
  })

  it('invalida e apaga a sessão por inatividade (expiresAt no passado)', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(buildSessionRow({ expiresAt: new Date(Date.now() - 1_000) }))
    expect(await resolveSessionToken(TOKEN, CHROME_LINUX)).toBeNull()
    expect(prisma.userSession.delete).toHaveBeenCalledWith({ where: { id: 's1' } })
  })

  it('invalida pelo teto absoluto mesmo com a janela de inatividade aberta', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(buildSessionRow({
      createdAt: new Date(Date.now() - SESSION_ABSOLUTE_TTL_MS - 1_000),
      expiresAt: new Date(Date.now() + SESSION_IDLE_TTL_MS),
    }))
    expect(await resolveSessionToken(TOKEN, CHROME_LINUX)).toBeNull()
    expect(prisma.userSession.delete).toHaveBeenCalled()
  })

  it('invalida quando o User-Agent muda de família (provável replay de token)', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(buildSessionRow())
    const user = await resolveSessionToken(TOKEN, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1')
    expect(user).toBeNull()
    expect(prisma.userSession.delete).toHaveBeenCalled()
  })

  it('tolera atualização de versão do mesmo navegador', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(buildSessionRow())
    const bumped = CHROME_LINUX.replace('Chrome/120.0.0', 'Chrome/131.0.0')
    const user = await resolveSessionToken(TOKEN, bumped)
    expect(user?.id).toBe('u1')
    expect(prisma.userSession.delete).not.toHaveBeenCalled()
  })

  it('invalida quando authVersion diverge (senha trocada / conta revogada)', async () => {
    const row = buildSessionRow()
    row.user.authVersion = 2 // usuário avançou; sessão ficou em 1
    prisma.userSession.findUnique.mockResolvedValueOnce(row)
    expect(await resolveSessionToken(TOKEN, CHROME_LINUX)).toBeNull()
  })

  it('desliza a janela de inatividade na atividade (>5min), limitada pelo teto', async () => {
    prisma.userSession.findUnique.mockResolvedValueOnce(
      buildSessionRow({ lastSeenAt: new Date(Date.now() - 10 * 60 * 1000) }),
    )
    await resolveSessionToken(TOKEN, CHROME_LINUX)
    expect(prisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ expiresAt: expect.any(Date), lastSeenAt: expect.any(Date) }),
      }),
    )
  })
})
