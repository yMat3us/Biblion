import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiBookSchema } from '@/lib/validation'
import { generateBookInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const { bookName } = await parseJson(req, aiBookSchema)
    return ok(await generateBookInsights(bookName))
  },
  { rateLimit: RateLimits.ai },
)
