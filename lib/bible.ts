import path from 'path'
import { promises as fs } from 'fs'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { logger } from '@/lib/logger'
import { cached } from '@/lib/redis'

// Conteúdo é imutável entre reseeds; 1h limita a defasagem após uma resseed
// (raro/manual) sem perder o benefício (o dado é quente e recacheia sozinho).
const CONTENT_TTL_SECONDS = 3_600

/**
 * Serviço da Bíblia.
 *
 * Fonte do conteúdo é config-gated: por padrão lê os JSON do filesystem (como
 * antes). Com CONTENT_SOURCE=mongo, lê do banco (um documento por capítulo) e
 * cai para o fs se o capítulo ainda não foi semeado — degradação graciosa que
 * permite semear e migrar sem downtime. Depois de semear e confirmar, o fs e o
 * outputFileTracingIncludes podem ser removidos (ver docs de arquitetura).
 *
 * Segurança: a versão é validada contra uma whitelist fixa; o caminho do arquivo
 * é montado só a partir dela — entrada do usuário nunca chega ao filesystem.
 * Performance: cache por capítulo na memória do processo (leitura quente sem I/O).
 */

export const BIBLE_VERSIONS = [
  'ACF', 'ALM1911', 'ARA', 'ARC', 'AS21', 'JFAA', 'KJA', 'KJF', 'NAA', 'NBV', 'NTLH', 'NVI', 'NVT',
] as const

export type BibleVersion = (typeof BIBLE_VERSIONS)[number]

const versionSet = new Set<string>(BIBLE_VERSIONS)

export function normalizeVersion(raw: string): BibleVersion | null {
  const upper = raw.toUpperCase()
  return versionSet.has(upper) ? (upper as BibleVersion) : null
}

interface BibleBook {
  abbrev: string
  name: string
  chapters: string[][]
}
type BibleData = BibleBook[]

export interface Verse {
  verse: number
  text: string
}

// Cache do arquivo inteiro (caminho fs) por versão.
const fsCache = new Map<BibleVersion, BibleData>()
const fsLoading = new Map<BibleVersion, Promise<BibleData>>()
// Cache por capítulo (Mongo ou fs), chave `version:book:chapter`.
const chapterCache = new Map<string, Verse[]>()

function contentFromMongo(): boolean {
  return process.env.CONTENT_SOURCE === 'mongo'
}

/** Lê e parseia um arquivo de versão do filesystem (cacheado, deduplicado). */
export async function readVersionFromFs(version: BibleVersion): Promise<BibleData> {
  const cached = fsCache.get(version)
  if (cached) return cached

  const inFlight = fsLoading.get(version)
  if (inFlight) return inFlight

  const promise = (async () => {
    const filePath = path.join(process.cwd(), 'Versions', `${version}.json`)
    const contents = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(contents) as BibleData
    fsCache.set(version, data)
    return data
  })()

  fsLoading.set(version, promise)
  try {
    return await promise
  } finally {
    fsLoading.delete(version)
  }
}

function toVerses(texts: string[]): Verse[] {
  return texts.map((text, index) => ({ verse: index + 1, text }))
}

async function chapterFromMongo(version: BibleVersion, bookIndex: number, chapter: number): Promise<Verse[] | null> {
  try {
    const row = await prisma.bibleChapter.findUnique({
      where: { version_bookIndex_chapter: { version, bookIndex, chapter } },
      select: { verses: true },
    })
    return row ? toVerses(row.verses) : null
  } catch (error) {
    logger.warn('bible_mongo_read_failed', { version, error })
    return null
  }
}

async function chapterFromFs(version: BibleVersion, bookIndex: number, chapter: number): Promise<Verse[]> {
  let data: BibleData
  try {
    data = await readVersionFromFs(version)
  } catch (err) {
    logger.error('bible_version_load_failed', { version, error: err })
    throw ApiErrors.serviceUnavailable('Não foi possível carregar a Bíblia')
  }

  if (bookIndex < 0 || bookIndex >= data.length) throw ApiErrors.notFound('Livro não encontrado')

  const book = data[bookIndex]
  const chapterIndex = chapter - 1
  if (chapterIndex < 0 || chapterIndex >= book.chapters.length) throw ApiErrors.notFound('Capítulo não encontrado')

  return toVerses(book.chapters[chapterIndex])
}

/** Retorna os versículos formatados de um capítulo, ou lança um ApiError tipado. */
export async function getChapter(rawVersion: string, bookIndex: number, chapter: number): Promise<Verse[]> {
  const version = normalizeVersion(rawVersion)
  if (!version) throw ApiErrors.notFound('Versão da Bíblia não encontrada')

  const key = `${version}:${bookIndex}:${chapter}`
  const local = chapterCache.get(key)
  if (local) return local

  // L1: memória do processo (acima). L2: Redis (cross-instância, TTL longo — o
  // conteúdo é imutável). Origem: Mongo quando habilitado, com fallback ao fs.
  const verses = await cached(`bible:v1:${key}`, CONTENT_TTL_SECONDS, async () =>
    (contentFromMongo() ? await chapterFromMongo(version, bookIndex, chapter) : null)
    ?? (await chapterFromFs(version, bookIndex, chapter)),
  )

  chapterCache.set(key, verses)
  return verses
}

/** Limpa os caches em memória (usado após semear e nos testes). */
export function resetBibleCache(): void {
  fsCache.clear()
  fsLoading.clear()
  chapterCache.clear()
}
