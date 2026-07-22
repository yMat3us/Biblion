import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, planoFavoritoSchema } from '@/lib/validation'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const { favoritar } = await parseJson(req, planoFavoritoSchema)
    return ok(await PlanoService.toggleFavorite(user.id, id, favoritar))
  },
  { rateLimit: RateLimits.standard },
)
