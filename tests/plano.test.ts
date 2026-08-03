import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  readingPlan: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findRaw: vi.fn(),
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
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import { PlanoService } from '@/lib/services/plano'
import { logger } from '@/lib/logger'

describe('PlanoService — visibilidade e progresso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.readingPlan.findFirst.mockResolvedValue(null)
    prisma.readingPlan.findUnique.mockResolvedValue(null)
    prisma.planEnrollment.findUnique.mockResolvedValue(null)
    prisma.favorito.findUnique.mockResolvedValue(null)
    prisma.dayProgress.count.mockResolvedValue(0)
  })

  it('busca o catálogo pelo índice de texto ($text) e restringe a público/oficial', async () => {
    prisma.readingPlan.findRaw.mockResolvedValueOnce([{ _id: { $oid: 'p1' } }])
    prisma.readingPlan.findMany.mockResolvedValueOnce([
      { id: 'p1', titulo: 'Salmos em 30 dias', ownerId: 'outro', visibility: 'PUBLIC', oficial: true },
    ])
    prisma.favorito.findMany.mockResolvedValueOnce([])
    prisma.planEnrollment.findMany.mockResolvedValueOnce([])

    const result = await PlanoService.listCatalog('owner-a', { categoria: '', q: 'salmos' })

    expect(result).toHaveLength(1)
    expect(prisma.readingPlan.findRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          $text: { $search: 'salmos' },
          $or: [{ visibility: 'PUBLIC' }, { oficial: true }],
        }),
      }),
    )
    // Os dados tipados vêm de um findMany pelos IDs devolvidos pelo índice.
    expect(prisma.readingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['p1'] } } }),
    )
  })

  it('degrada para busca por substring quando o índice de texto está indisponível', async () => {
    // Simula índice ausente (ex.: deploy sem db push): o $text estoura.
    prisma.readingPlan.findRaw.mockRejectedValueOnce(new Error('text index required for $text query'))
    prisma.readingPlan.findMany.mockResolvedValueOnce([
      { id: 'p2', titulo: 'Salmos para a alma', ownerId: 'outro', visibility: 'PUBLIC', oficial: false },
    ])
    prisma.favorito.findMany.mockResolvedValueOnce([])
    prisma.planEnrollment.findMany.mockResolvedValueOnce([])

    const result = await PlanoService.listCatalog('owner-a', { categoria: '', q: 'salmos' })

    // Catálogo continua no ar: cai para contains em vez de estourar 500.
    expect(result).toHaveLength(1)
    expect(prisma.readingPlan.findRaw).toHaveBeenCalled()
    expect(prisma.readingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { OR: [{ visibility: 'PUBLIC' }, { oficial: true }] },
            {
              OR: [
                { titulo: { contains: 'salmos', mode: 'insensitive' } },
                { descricao: { contains: 'salmos', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    )
    // A degradação é observável (misconfig do índice fica logada, não silenciosa).
    expect(logger.warn).toHaveBeenCalledWith('catalog_text_search_fallback', expect.any(Object))
  })

  it('aplica o filtro de categoria no fallback por substring', async () => {
    prisma.readingPlan.findRaw.mockRejectedValueOnce(new Error('no text index'))
    prisma.readingPlan.findMany.mockResolvedValueOnce([])

    await PlanoService.listCatalog('owner-a', { categoria: 'Salmos', q: 'alma' })

    expect(prisma.readingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { OR: [{ visibility: 'PUBLIC' }, { oficial: true }] },
            { categoria: 'Salmos' },
            {
              OR: [
                { titulo: { contains: 'alma', mode: 'insensitive' } },
                { descricao: { contains: 'alma', mode: 'insensitive' } },
              ],
            },
          ],
        },
      }),
    )
  })

  it('não chama o índice de texto quando não há termo de busca', async () => {
    prisma.readingPlan.findMany.mockResolvedValueOnce([])

    const result = await PlanoService.listCatalog('owner-a', { categoria: 'Salmos', q: '' })

    expect(result).toEqual([])
    expect(prisma.readingPlan.findRaw).not.toHaveBeenCalled()
    expect(prisma.readingPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ OR: [{ visibility: 'PUBLIC' }, { oficial: true }] }, { categoria: 'Salmos' }] },
      }),
    )
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
