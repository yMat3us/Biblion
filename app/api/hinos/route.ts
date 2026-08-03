import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { hinoListQuerySchema } from '@/lib/validation'
import { HinoService } from '@/lib/services/hino'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const params = req.nextUrl.searchParams
    const { hinario, q, categoria, favoritos } = hinoListQuerySchema.parse({
      hinario: params.get('hinario') ?? undefined,
      q: params.get('q') ?? undefined,
      categoria: params.get('categoria') ?? undefined,
      favoritos: params.get('favoritos') ?? undefined,
    })
    return ok(await HinoService.list(user.id, { hinario, q, categoria, favoritos }))
  },
  { rateLimit: RateLimits.standard },
)
