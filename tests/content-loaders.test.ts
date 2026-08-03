import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  bibleChapter: { findUnique: vi.fn() },
  hino: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { getChapter, resetBibleCache } from '@/lib/bible'
import { getHino, getNeighbors, listHinos, resetHarpaCache } from '@/lib/harpa'

describe('bible loader — fonte Mongo (CONTENT_SOURCE=mongo)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CONTENT_SOURCE', 'mongo')
    resetBibleCache()
  })

  it('lê o capítulo do Mongo e formata os versículos', async () => {
    prisma.bibleChapter.findUnique.mockResolvedValueOnce({ verses: ['No princípio…', 'A terra…'] })

    const verses = await getChapter('ACF', 0, 1)

    expect(verses).toEqual([
      { verse: 1, text: 'No princípio…' },
      { verse: 2, text: 'A terra…' },
    ])
    expect(prisma.bibleChapter.findUnique).toHaveBeenCalledWith({
      where: { version_bookIndex_chapter: { version: 'ACF', bookIndex: 0, chapter: 1 } },
      select: { verses: true },
    })
  })

  it('normaliza a versão e faz cache (a 2ª leitura não vai ao banco)', async () => {
    prisma.bibleChapter.findUnique.mockResolvedValue({ verses: ['v'] })

    await getChapter('acf', 0, 1)
    await getChapter('acf', 0, 1)

    expect(prisma.bibleChapter.findUnique).toHaveBeenCalledTimes(1)
  })

  it('404 para versão inexistente, sem tocar no banco', async () => {
    await expect(getChapter('XYZ', 0, 1)).rejects.toMatchObject({ status: 404 })
    expect(prisma.bibleChapter.findUnique).not.toHaveBeenCalled()
  })
})

describe('harpa loader — fonte Mongo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CONTENT_SOURCE', 'mongo')
    resetHarpaCache()
    prisma.hino.findMany.mockResolvedValue([
      { numero: 1, titulo: 'Chuvas de Graça', coro: null, estrofes: ['1a estrofe'] },
      { numero: 2, titulo: 'Saudosa Lembrança', coro: 'refrão', estrofes: ['1a', '2a'] },
    ])
  })

  it('lista os hinos ordenados a partir do Mongo', async () => {
    const list = await listHinos()
    expect(list).toEqual([
      { numero: 1, titulo: 'Chuvas de Graça' },
      { numero: 2, titulo: 'Saudosa Lembrança' },
    ])
  })

  it('retorna um hino completo e seus vizinhos', async () => {
    expect(await getHino(2)).toMatchObject({ numero: 2, coro: 'refrão', estrofes: ['1a', '2a'] })
    expect(await getNeighbors(1)).toEqual({ anterior: null, proximo: { numero: 2, titulo: 'Saudosa Lembrança' } })
  })
})
