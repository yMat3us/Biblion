import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  sermao: { deleteMany: vi.fn() },
  esboco: { deleteMany: vi.fn() },
  anotacao: { deleteMany: vi.fn() },
  favorito: { deleteMany: vi.fn() },
  licaoEBD: { deleteMany: vi.fn() },
  revistaEBD: { deleteMany: vi.fn() },
  configuracao: { deleteMany: vi.fn() },
  planEnrollment: { deleteMany: vi.fn() },
  readingPlan: { deleteMany: vi.fn() },
  friendship: { deleteMany: vi.fn() },
  block: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn() },
  message: { updateMany: vi.fn() },
  userSession: { deleteMany: vi.fn() },
  $transaction: vi.fn(),
}))

const password = vi.hoisted(() => ({ verifyPasswordHash: vi.fn() }))

vi.mock('@/lib/prisma', () => ({ prisma }))
vi.mock('@/lib/password', () => password)

import { AccountService } from '@/lib/services/account'

describe('AccountService.deleteAccount — exclusão/anonimização (LGPD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A transação executa o callback com o próprio prisma mockado como tx.
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
    for (const model of [
      prisma.sermao, prisma.esboco, prisma.anotacao, prisma.favorito, prisma.licaoEBD,
      prisma.revistaEBD, prisma.configuracao, prisma.planEnrollment, prisma.readingPlan,
      prisma.friendship, prisma.block, prisma.notification, prisma.userSession,
    ]) {
      model.deleteMany.mockResolvedValue({ count: 0 })
    }
    prisma.message.updateMany.mockResolvedValue({ count: 0 })
    prisma.user.update.mockResolvedValue({})
    password.verifyPasswordHash.mockResolvedValue(true)
  })

  it('rejeita com 401 quando a senha está incorreta (sem tocar nos dados)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'h', role: 'MEMBER', isActive: true })
    password.verifyPasswordHash.mockResolvedValueOnce(false)

    await expect(AccountService.deleteAccount('u1', 'errada')).rejects.toMatchObject({ status: 401 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('404 quando a conta não existe ou já está inativa', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null)
    await expect(AccountService.deleteAccount('u1', 'x')).rejects.toMatchObject({ status: 404 })
  })

  it('apaga conteúdo próprio, zera mensagens e anonimiza o usuário', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'h', role: 'MEMBER', isActive: true })

    await AccountService.deleteAccount('u1', 'correta')

    expect(prisma.sermao.deleteMany).toHaveBeenCalledWith({ where: { ownerId: 'u1' } })
    expect(prisma.readingPlan.deleteMany).toHaveBeenCalledWith({ where: { ownerId: 'u1' } })
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ requesterId: 'u1' }, { addresseeId: 'u1' }] },
    })
    // Conteúdo das mensagens apagado, estrutura preservada.
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: 'u1' },
      data: expect.objectContaining({ corpo: '', deletedAt: expect.any(Date) }),
    })
    // Anonimização da PII + invalidação de sessões.
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({
          displayName: 'Usuário removido',
          bio: null,
          avatarUrl: null,
          publicId: null,
          isActive: false,
          isSearchable: false,
          authVersion: { increment: 1 },
          deletedAt: expect.any(Date),
        }),
      }),
    )
  })

  it('impede o último owner ativo de se autoexcluir', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'h', role: 'OWNER', isActive: true })
    prisma.user.findFirst.mockResolvedValueOnce(null) // nenhum outro owner ativo

    await expect(AccountService.deleteAccount('owner-1', 'correta')).rejects.toMatchObject({ status: 400 })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('permite excluir um owner quando há outro owner ativo', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'h', role: 'OWNER', isActive: true })
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'owner-2' })

    await AccountService.deleteAccount('owner-1', 'correta')

    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(prisma.user.update).toHaveBeenCalled()
  })
})
