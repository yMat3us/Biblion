import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiVerseSchema } from '@/lib/validation'
import { generateBibleInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const { verseRef, verseText } = await parseJson(req, aiVerseSchema)
    return ok(await generateBibleInsights(verseRef, verseText))
  },
  { rateLimit: RateLimits.ai },
)
