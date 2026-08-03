import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { bibleParamsSchema } from '@/lib/validation'
import { getChapter } from '@/lib/bible'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ version: string; livroIndex: string; capitulo: string }> }

export const GET = route<Ctx>(
  async (_req, { params }) => {
    // Version is validated against a whitelist inside the bible service, so no
    // raw user input ever reaches the filesystem (path traversal is impossible).
    const { version, livroIndex, capitulo } = bibleParamsSchema.parse(await params)
    const verses = await getChapter(version, livroIndex, capitulo)

    // Bible text is immutable; allow private client caching to cut re-fetches.
    return ok(verses, { headers: { 'Cache-Control': 'private, max-age=86400' } })
  },
  { rateLimit: RateLimits.standard },
)
