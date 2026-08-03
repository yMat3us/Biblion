import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, cursorArgs, resolveTake, toCursorPage } from '@/lib/pagination'

describe('paginação por cursor — helper', () => {
  it('resolveTake normaliza para [1, MAX]', () => {
    expect(resolveTake()).toBe(DEFAULT_PAGE_SIZE)
    expect(resolveTake(null)).toBe(DEFAULT_PAGE_SIZE)
    expect(resolveTake(Number.NaN)).toBe(DEFAULT_PAGE_SIZE)
    expect(resolveTake(0)).toBe(DEFAULT_PAGE_SIZE) // 0 é falsy → tratado como "não informado"
    expect(resolveTake(-5)).toBe(1) // negativo é limitado ao mínimo
    expect(resolveTake(5)).toBe(5)
    expect(resolveTake(9999)).toBe(MAX_PAGE_SIZE)
  })

  it('cursorArgs pede size+1 e pula o item do cursor quando presente', () => {
    expect(cursorArgs(60)).toEqual({ take: 61 })
    expect(cursorArgs(60, 'abc')).toEqual({ take: 61, skip: 1, cursor: { id: 'abc' } })
  })

  it('toCursorPage corta e define nextCursor quando há próxima página', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(toCursorPage(rows, 2)).toEqual({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'b' })
    expect(toCursorPage(rows, 3)).toEqual({ items: rows, nextCursor: null })
    expect(toCursorPage([], 2)).toEqual({ items: [], nextCursor: null })
  })
})

const prisma = vi.hoisted(() => ({ sermao: { findMany: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ prisma }))

import { SermaoService } from '@/lib/services/sermao'

describe('SermaoService.list — paginação + busca server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.sermao.findMany.mockResolvedValue([])
  })

  it('pede DEFAULT+1 linhas e ordena por updatedAt,id (cursor estável)', async () => {
    await SermaoService.list('u1')
    expect(prisma.sermao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'u1' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: DEFAULT_PAGE_SIZE + 1,
      }),
    )
  })

  it('aplica busca server-side (OR contains) quando há q', async () => {
    await SermaoService.list('u1', { q: 'graça' })
    expect(prisma.sermao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: 'u1',
          OR: expect.arrayContaining([{ titulo: { contains: 'graça', mode: 'insensitive' } }]),
        }),
      }),
    )
  })

  it('passa cursor/skip e limita o take ao máximo', async () => {
    await SermaoService.list('u1', { cursor: 'c1', take: 500 })
    expect(prisma.sermao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_PAGE_SIZE + 1, skip: 1, cursor: { id: 'c1' } }),
    )
  })

  it('devolve nextCursor quando vêm size+1 linhas', async () => {
    const rows = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, i) => ({
      id: `s${i}`,
      titulo: 't',
      tema: null,
      textoBase: 'x',
      introducao: null,
      categoria: null,
      publicado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    prisma.sermao.findMany.mockResolvedValueOnce(rows)

    const page = await SermaoService.list('u1')

    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page.nextCursor).toBe(`s${DEFAULT_PAGE_SIZE - 1}`)
  })
})
