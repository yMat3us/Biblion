import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, bloquearSchema } from '@/lib/validation'
import { SocialService } from '@/lib/services/social'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { alvoId, bloquear } = await parseJson(req, bloquearSchema)
    return ok(await SocialService.setBlock(user.id, alvoId, bloquear))
  },
  { rateLimit: RateLimits.standard },
)
