import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiSermonSchema } from '@/lib/validation'
import { generateSermon } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

export const maxDuration = 60

export const POST = route(
  async (req: NextRequest) => {
    const input = await parseJson(req, aiSermonSchema)
    const sermon = await generateSermon({
      tema: input.tema,
      texto: input.texto,
      keyword: input.keyword,
      style: input.style,
      topicosBase: input.topicosBase,
    })
    return ok({ sermon })
  },
  { rateLimit: RateLimits.ai },
)
