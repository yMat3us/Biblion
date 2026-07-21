import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, revistaCreateSchema } from '@/lib/validation'
import { RevistaService } from '@/lib/services/ebd'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => ok(await RevistaService.list(user.id)),
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const data = await parseJson(req, revistaCreateSchema)
    return created(await RevistaService.create(user.id, data))
  },
  { rateLimit: RateLimits.standard },
)
