import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  bibleChapter: { deleteMany: vi.fn(), createMany: vi.fn() },
  hino: { deleteMany: vi.fn(), createMany: vi.fn() },
}))

const bible = vi.hoisted(() => ({
  BIBLE_VERSIONS: ['ACF'] as string[],
  normalizeVersion: (value: string) => (value.toUpperCase() === 'ACF' ? 'ACF' : null),
  readVersionFromFs: vi.fn(),
  resetBibleCache: vi.fn(),
}))

const harpa = vi.hoisted(() => ({ readHinosFromFs: vi.fn(), resetHarpaCache: vi.fn() }))

vi.mock('@/lib/prisma', () => ({ prisma }))
vi.mock('@/lib/bible', () => bible)
vi.mock('@/lib/harpa', () => harpa)

import { ContentSeed } from '@/lib/services/content-seed'

describe('ContentSeed — semeadura idempotente (apaga + insere em massa)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.bibleChapter.deleteMany.mockResolvedValue({ count: 0 })
    prisma.bibleChapter.createMany.mockResolvedValue({ count: 0 })
    prisma.hino.deleteMany.mockResolvedValue({ count: 0 })
    prisma.hino.createMany.mockResolvedValue({ count: 0 })
  })

  it('semeia uma versão da Bíblia achatando livros/capítulos em documentos', async () => {
    bible.readVersionFromFs.mockResolvedValueOnce([
      { abbrev: 'gn', name: 'Gênesis', chapters: [['v1', 'v2'], ['v1']] },
    ])

    const result = await ContentSeed.seedBibleVersion('acf')

    expect(prisma.bibleChapter.deleteMany).toHaveBeenCalledWith({ where: { version: 'ACF' } })
    expect(prisma.bibleChapter.createMany).toHaveBeenCalledWith({
      data: [
        { version: 'ACF', bookIndex: 0, chapter: 1, verses: ['v1', 'v2'] },
        { version: 'ACF', bookIndex: 0, chapter: 2, verses: ['v1'] },
      ],
    })
    expect(result).toEqual({ target: 'ACF', inserted: 2 })
  })

  it('rejeita versão inválida com 400', async () => {
    await expect(ContentSeed.seedBibleVersion('XXX')).rejects.toMatchObject({ status: 400 })
    expect(prisma.bibleChapter.createMany).not.toHaveBeenCalled()
  })

  it('semeia os hinos apagando tudo e reinserindo', async () => {
    harpa.readHinosFromFs.mockResolvedValueOnce(
      new Map([[1, { numero: 1, titulo: 'Chuvas de Graça', coro: null, estrofes: ['1a'] }]]),
    )

    const result = await ContentSeed.seedHinos()

    expect(prisma.hino.deleteMany).toHaveBeenCalledWith({})
    expect(prisma.hino.createMany).toHaveBeenCalledWith({
      data: [{ numero: 1, titulo: 'Chuvas de Graça', coro: null, estrofes: ['1a'] }],
    })
    expect(result).toEqual({ target: 'hinos', inserted: 1 })
  })

  it('seed(target) despacha para o alvo certo', async () => {
    harpa.readHinosFromFs.mockResolvedValueOnce(new Map())
    await ContentSeed.seed('hinos')
    expect(prisma.hino.createMany).toHaveBeenCalled()
    expect(prisma.bibleChapter.createMany).not.toHaveBeenCalled()
  })
})
