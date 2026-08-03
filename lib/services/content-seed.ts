import 'server-only'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { logger } from '@/lib/logger'
import { BIBLE_VERSIONS, normalizeVersion, readVersionFromFs, resetBibleCache } from '@/lib/bible'
import { readHinosFromFs, resetHarpaCache } from '@/lib/harpa'

/**
 * Popula o conteúdo global (Bíblia e hinário) no Mongo a partir dos JSON do
 * filesystem. Idempotente por alvo: apaga o que existe e reinsere em massa
 * (createMany), então pode ser rodado de novo com segurança. Chamado pela rota
 * interna guardada por CRON_SECRET; rode um alvo por chamada (uma versão da
 * Bíblia por vez, e o hinário à parte) para manter cada requisição limitada.
 */
export const ContentSeed = {
  targets: (): string[] => [...BIBLE_VERSIONS, 'hinos'],

  seedBibleVersion: async (rawVersion: string): Promise<{ target: string; inserted: number }> => {
    const version = normalizeVersion(rawVersion)
    if (!version) throw ApiErrors.badRequest('Versão da Bíblia inválida')

    const data = await readVersionFromFs(version)
    const docs: Prisma.BibleChapterCreateManyInput[] = []
    data.forEach((book, bookIndex) => {
      book.chapters.forEach((verses, chapterIndex) => {
        docs.push({ version, bookIndex, chapter: chapterIndex + 1, verses })
      })
    })

    await prisma.bibleChapter.deleteMany({ where: { version } })
    await prisma.bibleChapter.createMany({ data: docs })
    resetBibleCache()
    logger.info('content_seed_bible', { version, inserted: docs.length })
    return { target: version, inserted: docs.length }
  },

  seedHinos: async (): Promise<{ target: string; inserted: number }> => {
    const map = await readHinosFromFs()
    const docs: Prisma.HinoCreateManyInput[] = [...map.values()].map((hino) => ({
      numero: hino.numero,
      titulo: hino.titulo,
      coro: hino.coro,
      estrofes: hino.estrofes,
    }))

    await prisma.hino.deleteMany({})
    await prisma.hino.createMany({ data: docs })
    resetHarpaCache()
    logger.info('content_seed_hinos', { inserted: docs.length })
    return { target: 'hinos', inserted: docs.length }
  },

  seed: async (target: string): Promise<{ target: string; inserted: number }> => {
    return target === 'hinos' ? ContentSeed.seedHinos() : ContentSeed.seedBibleVersion(target)
  },
}
