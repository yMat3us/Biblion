import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiTeologiaSchema } from '@/lib/validation'
import { deepenTheology } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseJson(req, aiTeologiaSchema)
    const text = await deepenTheology(input)
    return ok({ text })
  },
  { rateLimit: RateLimits.ai },
)
