import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiChapterSchema } from '@/lib/validation'
import { generateChapterInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const { chapterRef, chapterText } = await parseJson(req, aiChapterSchema)
    return ok(await generateChapterInsights(chapterRef, chapterText))
  },
  { rateLimit: RateLimits.ai },
)
