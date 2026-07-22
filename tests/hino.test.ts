import { beforeEach, describe, expect, it, vi } from 'vitest'

const harpa = vi.hoisted(() => ({
  listHinos: vi.fn(),
  getHino: vi.fn(),
  getNeighbors: vi.fn(),
}))

const prisma = vi.hoisted(() => ({
  favorito: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock('@/lib/harpa', () => harpa)
vi.mock('@/lib/prisma', () => ({ prisma }))

import { HinoService } from '@/lib/services/hino'

describe('HinoService — conteúdo do arquivo Harpa.json + favoritos por conta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    harpa.listHinos.mockResolvedValue([
      { numero: 1, titulo: 'Chuvas de Graça' },
      { numero: 2, titulo: 'Saudosa Lembrança' },
    ])
    harpa.getHino.mockResolvedValue(null)
    harpa.getNeighbors.mockResolvedValue({ anterior: null, proximo: null })
    prisma.favorito.findMany.mockResolvedValue([])
    prisma.favorito.findUnique.mockResolvedValue(null)
  })

  it('lê os favoritos do próprio usuário e escopa por hinário', async () => {
    prisma.favorito.findMany.mockResolvedValueOnce([{ referencia: 'harpa:1' }])

    const result = await HinoService.list('owner-a', { hinario: 'harpa', q: '', categoria: '', favoritos: false })

    expect(result.favoritos).toEqual([1])
    expect(result.hinos.map((h) => h.numero)).toEqual([1, 2])
    expect(prisma.favorito.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-a', tipo: 'hino', referencia: { startsWith: 'harpa:' } },
      select: { referencia: true },
    })
  })

  it('filtra apenas os favoritos quando solicitado', async () => {
    prisma.favorito.findMany.mockResolvedValueOnce([{ referencia: 'harpa:2' }])

    const result = await HinoService.list('owner-a', { hinario: 'harpa', q: '', categoria: '', favoritos: true })

    expect(result.hinos.map((h) => h.numero)).toEqual([2])
  })

  it('busca por título ou número', async () => {
    const porTitulo = await HinoService.list('owner-a', { hinario: 'harpa', q: 'saudosa', categoria: '', favoritos: false })
    expect(porTitulo.hinos.map((h) => h.numero)).toEqual([2])

    const porNumero = await HinoService.list('owner-a', { hinario: 'harpa', q: '1', categoria: '', favoritos: false })
    expect(porNumero.hinos.map((h) => h.numero)).toEqual([1])
  })

  it('favorita um hino de forma idempotente e escopada ao dono', async () => {
    harpa.getHino.mockResolvedValueOnce({ numero: 12, titulo: 'Hino X', coro: null, estrofes: [] })

    const result = await HinoService.toggleFavorite('owner-a', 'harpa', 12, true)

    expect(result).toEqual({ favorited: true })
    expect(prisma.favorito.upsert).toHaveBeenCalledWith({
      where: { ownerId_tipo_referencia: { ownerId: 'owner-a', tipo: 'hino', referencia: 'harpa:12' } },
      update: { titulo: 'Hino X' },
      create: { ownerId: 'owner-a', tipo: 'hino', referencia: 'harpa:12', titulo: 'Hino X' },
    })
    expect(prisma.favorito.deleteMany).not.toHaveBeenCalled()
  })

  it('remove apenas o favorito do próprio usuário', async () => {
    harpa.getHino.mockResolvedValueOnce({ numero: 12, titulo: 'Hino X', coro: null, estrofes: [] })

    const result = await HinoService.toggleFavorite('owner-a', 'harpa', 12, false)

    expect(result).toEqual({ favorited: false })
    expect(prisma.favorito.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-a', tipo: 'hino', referencia: 'harpa:12' },
    })
  })

  it('retorna 404 ao ler um hino inexistente', async () => {
    harpa.getHino.mockResolvedValueOnce(null)

    await expect(HinoService.get('owner-a', 'harpa', 999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('retorna o hino com estrofes, coro, vizinhos e favorito', async () => {
    harpa.getHino.mockResolvedValueOnce({ numero: 1, titulo: 'Chuvas de Graça', coro: 'Chuvas de graça', estrofes: ['1a estrofe', '2a estrofe'] })
    harpa.getNeighbors.mockResolvedValueOnce({ anterior: null, proximo: { numero: 2, titulo: 'Saudosa Lembrança' } })
    prisma.favorito.findUnique.mockResolvedValueOnce({ id: 'f1' })

    const result = await HinoService.get('owner-a', 'harpa', 1)

    expect(result).toMatchObject({
      numero: 1,
      titulo: 'Chuvas de Graça',
      coro: 'Chuvas de graça',
      estrofes: ['1a estrofe', '2a estrofe'],
      favorito: true,
      proximo: { numero: 2 },
    })
  })
})
