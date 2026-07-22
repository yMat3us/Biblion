import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  readingPlan: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  planEnrollment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  dayProgress: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  favorito: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { PlanoService } from '@/lib/services/plano'

describe('PlanoService — visibilidade e progresso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.readingPlan.findFirst.mockResolvedValue(null)
    prisma.readingPlan.findUnique.mockResolvedValue(null)
    prisma.planEnrollment.findUnique.mockResolvedValue(null)
    prisma.favorito.findUnique.mockResolvedValue(null)
    prisma.dayProgress.count.mockResolvedValue(0)
  })

  it('retorna 404 quando o plano não é visível para o usuário', async () => {
    prisma.readingPlan.findFirst.mockResolvedValueOnce(null)

    await expect(PlanoService.get('owner-a', 'plano-alheio')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(prisma.readingPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plano-alheio', OR: [{ ownerId: 'owner-a' }, { visibility: 'PUBLIC' }, { oficial: true }] },
      }),
    )
  })

  it('só permite ler planos próprios, públicos ou oficiais e expõe os dias concluídos', async () => {
    prisma.readingPlan.findFirst.mockResolvedValueOnce({
      id: 'p1',
      ownerId: 'owner-a',
      titulo: 'Filipenses em 7 dias',
      descricao: null,
      categoria: null,
      duracaoDias: 2,
      visibility: 'PUBLIC',
      oficial: false,
      owner: { displayName: 'Ana', username: 'ana', publicId: null },
      dias: [],
    })
    prisma.planEnrollment.findUnique.mockResolvedValueOnce({
      status: 'ACTIVE',
      diaAtual: 2,
      startedAt: new Date(),
      completedAt: null,
      progresso: [{ dia: 1 }],
    })

    const result = await PlanoService.get('owner-a', 'p1')

    expect(result.isOwner).toBe(true)
    expect(result.diasConcluidos).toEqual([1])
    expect(result.matricula).toMatchObject({ status: 'ACTIVE', diaAtual: 2 })
  })

  it('exige matrícula antes de registrar progresso', async () => {
    prisma.planEnrollment.findUnique.mockResolvedValueOnce(null)

    await expect(PlanoService.completeDay('owner-a', 'p1', 1, true)).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    })
    expect(prisma.dayProgress.upsert).not.toHaveBeenCalled()
  })

  it('conclui o plano quando todos os dias foram marcados', async () => {
    prisma.planEnrollment.findUnique.mockResolvedValueOnce({ id: 'e1' })
    prisma.readingPlan.findUnique.mockResolvedValueOnce({ duracaoDias: 2 })
    prisma.dayProgress.upsert.mockResolvedValueOnce({})
    prisma.dayProgress.count.mockResolvedValueOnce(2)

    const result = await PlanoService.completeDay('owner-a', 'p1', 2, true)

    expect(result).toEqual({ concluidos: 2, finalizado: true })
    expect(prisma.planEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      }),
    )
  })

  it('favorita um plano visível de forma escopada ao usuário', async () => {
    prisma.readingPlan.findFirst.mockResolvedValueOnce({ id: 'p1', titulo: 'Plano X' })

    const result = await PlanoService.toggleFavorite('owner-a', 'p1', true)

    expect(result).toEqual({ favorited: true })
    expect(prisma.favorito.upsert).toHaveBeenCalledWith({
      where: { ownerId_tipo_referencia: { ownerId: 'owner-a', tipo: 'plano', referencia: 'p1' } },
      update: { titulo: 'Plano X' },
      create: { ownerId: 'owner-a', tipo: 'plano', referencia: 'p1', titulo: 'Plano X' },
    })
  })
})
