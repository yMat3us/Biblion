import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { readVersionFromFs, BIBLE_VERSIONS, type BibleVersion } from '@/lib/bible'
import { RateLimits } from '@/lib/rate-limit'
import { LIVROS_BIBLIA } from '@/data/livros'
import { getVerseExtras } from '@/lib/ai-verse-extras'
import type { VersionComparisonEntry } from '@/lib/ai-audit-types'

const VERSION_NAMES: Record<BibleVersion, string> = {
  ACF: 'Almeida Corrigida Fiel',
  ALM1911: 'Almeida 1911',
  ARA: 'Almeida Revista e Atualizada',
  ARC: 'Almeida Revista e Corrigida',
  AS21: 'Almeida Século 21',
  JFAA: 'João Ferreira de Almeida Atualizada',
  KJA: 'King James Atualizada',
  KJF: 'King James Fiel',
  NAA: 'Nova Almeida Atualizada',
  NBV: 'Nova Bíblia Viva',
  NTLH: 'Nova Tradução na Linguagem de Hoje',
  NVI: 'Nova Versão Internacional',
  NVT: 'Nova Versão Transformadora',
}

const compareQuerySchema = z.object({
  bookIndex: z.coerce.number().int().min(0).max(65),
  chapter: z.coerce.number().int().min(1),
  verse: z.coerce.number().int().min(1),
})

export const GET = route(
  async (req: NextRequest) => {
    const { bookIndex, chapter, verse } = compareQuerySchema.parse({
      bookIndex: req.nextUrl.searchParams.get('bookIndex'),
      chapter: req.nextUrl.searchParams.get('chapter'),
      verse: req.nextUrl.searchParams.get('verse'),
    })

    const results = (
      await Promise.all(
        BIBLE_VERSIONS.map(async (version): Promise<VersionComparisonEntry | null> => {
          try {
            const data = await readVersionFromFs(version)
            if (bookIndex < 0 || bookIndex >= data.length) return null
            const book = data[bookIndex]
            const chapterIndex = chapter - 1
            if (chapterIndex < 0 || chapterIndex >= book.chapters.length) return null
            const chapterVerses = book.chapters[chapterIndex]
            const verseIndex = verse - 1
            if (verseIndex < 0 || verseIndex >= chapterVerses.length) return null
            const text = chapterVerses[verseIndex]
            if (!text) return null
            return {
              version,
              name: VERSION_NAMES[version],
              text,
              language: 'pt',
            }
          } catch {
            return null
          }
        }),
      )
    ).filter((entry): entry is VersionComparisonEntry => entry !== null)

    // Complementa com o texto original (hebraico/aramaico ou grego) e a KJV,
    // gerados por IA e cacheados. Best-effort: se falhar, mantém só o português.
    // Desativado por ora — mude para `true` para reativar.
    const INCLUDE_AI_EXTRAS: boolean = false
    const livro = INCLUDE_AI_EXTRAS ? LIVROS_BIBLIA[bookIndex] : undefined
    if (livro) {
      const ref = `${livro.nome} ${chapter}:${verse}`
      const ptSample = results.find((r) => r.version === 'ACF')?.text ?? results[0]?.text ?? ''
      const extras = await getVerseExtras(ref, ptSample)
      if (extras) {
        if (extras.originalText) {
          results.push({
            version: 'Original',
            name: livro.testamento === 'AT' ? 'Texto Original (Hebraico/Aramaico)' : 'Texto Original (Grego)',
            text: extras.originalText,
            language: livro.testamento === 'AT' ? 'he' : 'el',
          })
        }
        if (extras.kjvText) {
          results.push({
            version: 'KJV',
            name: 'King James Version',
            text: extras.kjvText,
            language: 'en',
          })
        }
      }
    }

    return ok(results, { headers: { 'Cache-Control': 'private, max-age=86400' } })
  },
  { rateLimit: RateLimits.standard },
)
