import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, hinoFavoritoSchema, hinoParamsSchema } from '@/lib/validation'
import { HinoService } from '@/lib/services/hino'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ numero: string }> }

export const POST = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { numero } = hinoParamsSchema.parse(await params)
    const { hinario, favoritar } = await parseJson(req, hinoFavoritoSchema)
    return ok(await HinoService.toggleFavorite(user.id, hinario, numero, favoritar))
  },
  { rateLimit: RateLimits.standard },
)
