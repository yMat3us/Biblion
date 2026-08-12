import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { z } from 'zod'
import { parseJson } from '@/lib/validation'
import { generateBookInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const maxDuration = 60

export const POST = route(
  async (req: NextRequest) => {
    const { bookName } = await parseJson(req, z.object({ bookName: z.string() }))

    const insights = await generateBookInsights(bookName)

    return ok(insights)
  },
  { rateLimit: RateLimits.ai },
)
