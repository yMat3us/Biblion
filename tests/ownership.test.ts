import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  sermao: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  revistaEBD: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  licaoEBD: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { LicaoService, RevistaService } from '@/lib/services/ebd'
import { SermaoService } from '@/lib/services/sermao'

describe('owner-scoped data services', () => {
  beforeEach(() => {
    prisma.sermao.findMany.mockResolvedValue([])
    prisma.sermao.findFirst.mockResolvedValue(null)
    prisma.sermao.create.mockResolvedValue({ id: 'sermao-1' })
    prisma.revistaEBD.findFirst.mockResolvedValue(null)
    prisma.licaoEBD.create.mockResolvedValue({ id: 'licao-1' })
  })

  it('always scopes sermon lists and searches to the authenticated owner', async () => {
    await SermaoService.list('owner-a')
    await SermaoService.search('owner-a', 'graça', 3)

    expect(prisma.sermao.findMany).toHaveBeenNthCalledWith(1, {
      where: { ownerId: 'owner-a' },
      orderBy: { updatedAt: 'desc' },
    })
    expect(prisma.sermao.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ ownerId: 'owner-a' }),
      take: 3,
    }))
  })

  it('overwrites any forged ownerId during sermon creation', async () => {
    const forgedInput = {
      titulo: 'Sermão seguro',
      textoBase: 'João 3:16',
      publicado: false,
      ownerId: 'owner-invasor',
    }

    await SermaoService.create('owner-a', forgedInput)

    expect(prisma.sermao.create).toHaveBeenCalledWith({
      data: { ...forgedInput, ownerId: 'owner-a' },
    })
  })

  it('returns 404 instead of exposing a sermon owned by another account', async () => {
    prisma.sermao.findFirst.mockResolvedValueOnce(null)

    await expect(SermaoService.get('owner-a', 'sermao-alheio')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    expect(prisma.sermao.findFirst).toHaveBeenCalledWith({
      where: { id: 'sermao-alheio', ownerId: 'owner-a' },
    })
  })

  it('rejects creating a lesson under a magazine from another owner', async () => {
    prisma.revistaEBD.findFirst.mockResolvedValueOnce(null)

    await expect(LicaoService.create('owner-a', {
      titulo: 'Lição isolada',
      revistaId: 'revista-alheia',
    })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })

    expect(prisma.revistaEBD.findFirst).toHaveBeenCalledWith({
      where: { id: 'revista-alheia', ownerId: 'owner-a' },
    })
    expect(prisma.licaoEBD.create).not.toHaveBeenCalled()
  })

  it('injects the owner into a lesson after validating its magazine', async () => {
    prisma.revistaEBD.findFirst.mockResolvedValueOnce({ id: 'revista-a' })
    const forgedInput = {
      titulo: 'Lição válida',
      revistaId: 'revista-a',
      ownerId: 'owner-invasor',
    }

    await LicaoService.create('owner-a', forgedInput)

    expect(prisma.licaoEBD.create).toHaveBeenCalledWith({
      data: { ...forgedInput, ownerId: 'owner-a' },
    })
  })

  it('filters nested lessons when loading a magazine', async () => {
    prisma.revistaEBD.findFirst.mockResolvedValueOnce({ id: 'revista-a', licoes: [] })

    await RevistaService.findWithLicoes('owner-a', 'revista-a')

    expect(prisma.revistaEBD.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'revista-a', ownerId: 'owner-a' },
      select: expect.objectContaining({
        licoes: expect.objectContaining({ where: { ownerId: 'owner-a' } }),
      }),
    }))
  })
})
