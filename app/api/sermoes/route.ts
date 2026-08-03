import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, sermaoCreateSchema } from '@/lib/validation'
import { SermaoService } from '@/lib/services/sermao'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const params = req.nextUrl.searchParams
    return ok(
      await SermaoService.list(user.id, {
        cursor: params.get('cursor'),
        q: params.get('q'),
        take: params.get('take') ? Number(params.get('take')) : undefined,
      }),
    )
  },
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const data = await parseJson(req, sermaoCreateSchema)
    return created(await SermaoService.create(user.id, data))
  },
  { rateLimit: RateLimits.standard },
)
