import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, sermaoCreateSchema } from '@/lib/validation'
import { SermaoService } from '@/lib/services/sermao'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => ok(await SermaoService.list(user.id)),
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const data = await parseJson(req, sermaoCreateSchema)
    return created(await SermaoService.create(user.id, data))
  },
  { rateLimit: RateLimits.standard },
)
