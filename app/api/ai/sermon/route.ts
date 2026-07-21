import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiSermonSchema } from '@/lib/validation'
import { generateSermon } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseJson(req, aiSermonSchema)
    const sermon = await generateSermon(input)
    return ok({ sermon })
  },
  { rateLimit: RateLimits.ai },
)
