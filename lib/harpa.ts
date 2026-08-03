import path from 'path'
import { promises as fs } from 'fs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { cached } from '@/lib/redis'

const CONTENT_TTL_SECONDS = 3_600

/**
 * Serviço da Harpa Cristã.
 *
 * Como a Bíblia, o hinário é conteúdo global e imutável. Fonte config-gated: por
 * padrão lê o `Harpa.json` do filesystem; com CONTENT_SOURCE=mongo lê do banco e
 * cai para o fs se ainda não foi semeado (degradação graciosa). Mantido em cache
 * na memória do processo. Favoritos, por serem por usuário, seguem no banco.
 */

export interface HinoResumo {
  numero: number
  titulo: string
}

export interface Hino extends HinoResumo {
  coro: string | null
  estrofes: string[]
}

let cache: Map<number, Hino> | null = null
let ordered: HinoResumo[] | null = null
let loading: Promise<void> | null = null

interface RawHino {
  hino?: unknown
  coro?: unknown
  verses?: unknown
}

function contentFromMongo(): boolean {
  return process.env.CONTENT_SOURCE === 'mongo'
}

/** Converte o texto com marcações `<br>` do dataset em texto puro com quebras de linha. */
function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** "1 - Chuvas de Graça" -> "Chuvas de Graça" */
function cleanTitle(raw: string, numero: number): string {
  const stripped = raw.replace(/^\s*\d+\s*[-–—:.]\s*/, '').trim()
  return stripped || `Hino ${numero}`
}

/** Lê e parseia o Harpa.json do filesystem, devolvendo o mapa de hinos. */
export async function readHinosFromFs(): Promise<Map<number, Hino>> {
  const filePath = path.join(process.cwd(), 'Harpa.json')
  const contents = await fs.readFile(filePath, 'utf8')
  const raw = JSON.parse(contents) as Record<string, RawHino>

  const map = new Map<number, Hino>()
  for (const [key, value] of Object.entries(raw)) {
    const numero = Number(key)
    // A chave "-1" guarda créditos/metadados do dataset — ignorada.
    if (!Number.isInteger(numero) || numero < 1) continue
    if (!value || typeof value.hino !== 'string') continue

    const versesRaw = value.verses && typeof value.verses === 'object' ? (value.verses as Record<string, unknown>) : {}
    const estrofes = Object.keys(versesRaw)
      .map((k) => Number(k))
      .filter((k) => Number.isFinite(k))
      .sort((a, b) => a - b)
      .map((k) => (typeof versesRaw[String(k)] === 'string' ? htmlToText(versesRaw[String(k)] as string) : ''))
      .filter((estrofe) => estrofe.length > 0)

    map.set(numero, {
      numero,
      titulo: cleanTitle(value.hino, numero),
      coro: typeof value.coro === 'string' && value.coro.trim() ? htmlToText(value.coro) : null,
      estrofes,
    })
  }
  return map
}

function populate(map: Map<number, Hino>): void {
  cache = map
  ordered = [...map.values()]
    .sort((a, b) => a.numero - b.numero)
    .map((hino) => ({ numero: hino.numero, titulo: hino.titulo }))
}

async function loadFromMongo(): Promise<boolean> {
  try {
    const rows = await prisma.hino.findMany({
      orderBy: { numero: 'asc' },
      select: { numero: true, titulo: true, coro: true, estrofes: true },
    })
    if (rows.length === 0) return false
    populate(new Map(rows.map((row) => [row.numero, row])))
    return true
  } catch (error) {
    logger.warn('harpa_mongo_read_failed', { error })
    return false
  }
}

async function load(): Promise<void> {
  if (cache) return
  if (loading) return loading

  loading = (async () => {
    // Mongo primeiro quando habilitado; se vazio/erro, cai para o fs.
    if (contentFromMongo() && (await loadFromMongo())) return
    populate(await readHinosFromFs())
  })()

  try {
    await loading
  } finally {
    loading = null
  }
}

export async function listHinos(): Promise<HinoResumo[]> {
  // L2 Redis (cross-instância) sobre o cache em processo; conteúdo imutável.
  return cached('hinos:v1:list', CONTENT_TTL_SECONDS, async () => {
    await load()
    return ordered ?? []
  })
}

export async function getHino(numero: number): Promise<Hino | null> {
  await load()
  return cache?.get(numero) ?? null
}

export async function getNeighbors(numero: number): Promise<{ anterior: HinoResumo | null; proximo: HinoResumo | null }> {
  await load()
  const list = ordered ?? []
  const index = list.findIndex((hino) => hino.numero === numero)
  if (index === -1) return { anterior: null, proximo: null }
  return {
    anterior: index > 0 ? list[index - 1] : null,
    proximo: index < list.length - 1 ? list[index + 1] : null,
  }
}

/** Limpa o cache em memória (usado após semear e nos testes). */
export function resetHarpaCache(): void {
  cache = null
  ordered = null
  loading = null
}
