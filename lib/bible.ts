import path from 'path'
import { promises as fs } from 'fs'
import { ApiErrors } from '@/lib/http'

/**
 * Bible service.
 *
 * Security: the requested version is validated against a fixed whitelist and
 * the file path is built exclusively from that constant — raw user input never
 * reaches the filesystem, closing the previous path-traversal hole.
 *
 * Performance: each ~4MB version file is read and parsed at most once per
 * process and kept in an in-memory cache (previously re-read/parsed on every
 * single chapter request). Concurrent first-loads are de-duplicated.
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

const cache = new Map<BibleVersion, BibleData>()
const loading = new Map<BibleVersion, Promise<BibleData>>()

async function loadVersion(version: BibleVersion): Promise<BibleData> {
  const cached = cache.get(version)
  if (cached) return cached

  const inFlight = loading.get(version)
  if (inFlight) return inFlight

  const promise = (async () => {
    const filePath = path.join(process.cwd(), 'Versions', `${version}.json`)
    const contents = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(contents) as BibleData
    cache.set(version, data)
    return data
  })()

  loading.set(version, promise)
  try {
    return await promise
  } finally {
    loading.delete(version)
  }
}

export interface Verse {
  verse: number
  text: string
}

/** Returns the formatted verses for a chapter, or throws a typed ApiError. */
export async function getChapter(
  rawVersion: string,
  bookIndex: number,
  chapter: number,
): Promise<Verse[]> {
  const version = normalizeVersion(rawVersion)
  if (!version) throw ApiErrors.notFound('Versão da Bíblia não encontrada')

  let data: BibleData
  try {
    data = await loadVersion(version)
  } catch (err) {
    console.error('[BIBLE] Falha ao carregar versão', version, err)
    throw ApiErrors.serviceUnavailable('Não foi possível carregar a Bíblia')
  }

  if (bookIndex < 0 || bookIndex >= data.length) {
    throw ApiErrors.notFound('Livro não encontrado')
  }

  const book = data[bookIndex]
  const chapterIndex = chapter - 1
  if (chapterIndex < 0 || chapterIndex >= book.chapters.length) {
    throw ApiErrors.notFound('Capítulo não encontrado')
  }

  return book.chapters[chapterIndex].map((text, index) => ({ verse: index + 1, text }))
}
