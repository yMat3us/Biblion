import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  friendship: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  block: { findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  outboxEvent: { create: vi.fn() },
  readingPlan: { findMany: vi.fn() },
  sermao: { findMany: vi.fn() },
  esboco: { findMany: vi.fn() },
  anotacao: { findMany: vi.fn() },
  licaoEBD: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { SocialService, MAX_PENDING_SENT_REQUESTS } from '@/lib/services/social'
import { PublicProfileService } from '@/lib/services/public-profile'

function profileRow(overrides: Record<string, unknown>) {
  return {
    id: 'bob',
    publicId: 'bobpublicid12',
    username: 'bob',
    displayName: 'Bob',
    avatarUrl: null,
    bio: null,
    accentColor: 'violet',
    profileVisibility: 'PUBLIC',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('SocialService — amizades e bloqueio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.findMany.mockResolvedValue([])
    prisma.friendship.findFirst.mockResolvedValue(null)
    prisma.friendship.findMany.mockResolvedValue([])
    prisma.friendship.count.mockResolvedValue(0)
    prisma.block.findFirst.mockResolvedValue(null)
    prisma.block.findMany.mockResolvedValue([])
    prisma.outboxEvent.create.mockResolvedValue({ id: 'o1' })
  })

  it('bloqueio (em qualquer direção) impede a solicitação e responde 404 genérico', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    prisma.block.findFirst.mockResolvedValueOnce({ blockerId: 'bob' })

    await expect(SocialService.sendRequest('alice', 'bob')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(prisma.friendship.create).not.toHaveBeenCalled()
  })

  it('barra o envio quando o solicitante já atingiu o teto de pendentes', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    prisma.block.findFirst.mockResolvedValueOnce(null)
    prisma.friendship.findFirst.mockResolvedValueOnce(null) // ainda não há relação
    prisma.friendship.count.mockResolvedValueOnce(MAX_PENDING_SENT_REQUESTS)

    await expect(SocialService.sendRequest('alice', 'bob')).rejects.toMatchObject({
      status: 429,
      code: 'TOO_MANY_REQUESTS',
    })
    expect(prisma.friendship.create).not.toHaveBeenCalled()
    expect(prisma.friendship.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requesterId: 'alice', status: 'PENDING' } }),
    )
  })

  it('cria a solicitação pendente quando abaixo do teto', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    prisma.block.findFirst.mockResolvedValueOnce(null)
    prisma.friendship.findFirst.mockResolvedValueOnce(null)
    prisma.friendship.count.mockResolvedValueOnce(0)
    prisma.friendship.create.mockResolvedValueOnce({ id: 'f-new' })

    await expect(SocialService.sendRequest('alice', 'bob')).resolves.toEqual({ status: 'pending_sent' })
    expect(prisma.friendship.create).toHaveBeenCalled()
    // Notificação desacoplada: a solicitação enfileira um evento no outbox.
    expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'friend.requested' }) }),
    )
  })

  it('aceita automaticamente quando o alvo já havia solicitado (aceite mútuo)', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    prisma.block.findFirst.mockResolvedValueOnce(null)
    prisma.friendship.findFirst.mockResolvedValueOnce({ id: 'f1', requesterId: 'bob', status: 'PENDING' })

    const result = await SocialService.sendRequest('alice', 'bob')

    expect(result).toEqual({ status: 'friends' })
    expect(prisma.friendship.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f1' }, data: expect.objectContaining({ status: 'ACCEPTED' }) }),
    )
    expect(prisma.friendship.create).not.toHaveBeenCalled()
  })

  it('relationship reconhece quando o outro me bloqueou', async () => {
    prisma.block.findFirst.mockResolvedValueOnce({ blockerId: 'bob' })
    await expect(SocialService.relationship('alice', 'bob')).resolves.toBe('blocked_by')
  })

  it('a busca exclui usuários bloqueados e restringe a buscáveis diferentes de mim', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'bob', publicId: 'x', username: 'bob', displayName: null, avatarUrl: null, bio: null },
      { id: 'carol', publicId: 'y', username: 'carol', displayName: null, avatarUrl: null, bio: null },
    ])
    prisma.block.findMany.mockResolvedValueOnce([{ blockerId: 'alice', blockedId: 'carol' }])
    prisma.friendship.findMany.mockResolvedValueOnce([])

    const result = await SocialService.search('alice', 'b')

    expect(result.map((u) => u.id)).toEqual(['bob'])
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isSearchable: true, id: { not: 'alice' } }) }),
    )
  })
})

describe('PublicProfileService — visibilidade do perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.block.findFirst.mockResolvedValue(null)
    prisma.friendship.findFirst.mockResolvedValue(null)
    for (const model of [prisma.readingPlan, prisma.sermao, prisma.esboco, prisma.anotacao, prisma.licaoEBD]) {
      model.findMany.mockResolvedValue([])
    }
  })

  it('perfil PRIVATE de terceiro retorna 404 e não carrega conteúdo', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(profileRow({ profileVisibility: 'PRIVATE' }))

    await expect(PublicProfileService.getByPublicId('alice', 'bobpublicid12')).rejects.toMatchObject({ status: 404 })
    expect(prisma.readingPlan.findMany).not.toHaveBeenCalled()
  })

  it('perfil FRIENDS mostra apenas o cabeçalho para quem não é amigo', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(profileRow({ profileVisibility: 'FRIENDS' }))

    const result = await PublicProfileService.getByPublicId('alice', 'bobpublicid12')

    expect(result.restrito).toBe(true)
    expect(result.relationship).toBe('none')
    expect(prisma.readingPlan.findMany).not.toHaveBeenCalled()
  })

  it('perfil PUBLIC expõe somente conteúdo com visibility PUBLIC', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(profileRow({ profileVisibility: 'PUBLIC' }))

    const result = await PublicProfileService.getByPublicId('alice', 'bobpublicid12')

    expect(result.restrito).toBe(false)
    expect(prisma.readingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'bob', visibility: 'PUBLIC' } }),
    )
    expect(prisma.sermao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'bob', visibility: 'PUBLIC' } }),
    )
  })
})
