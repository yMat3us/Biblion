import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, searchSchema } from '@/lib/validation'
import { SermaoService } from '@/lib/services/sermao'
import { LicaoService } from '@/lib/services/ebd'
import { semanticBibleSearch } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { query, includeAi } = await parseJson(req, searchSchema)
    const [sermons, lessons] = await Promise.all([
      SermaoService.search(user.id, query),
      LicaoService.search(user.id, query),
    ])
    const aiResults = includeAi ? await semanticBibleSearch(query) : null
    return ok({ localResults: { sermons, lessons }, aiResults })
  },
  { rateLimit: RateLimits.ai },
)
