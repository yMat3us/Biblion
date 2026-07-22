import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, amigoResponderSchema } from '@/lib/validation'
import { SocialService } from '@/lib/services/social'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { solicitanteId, aceitar } = await parseJson(req, amigoResponderSchema)
    return ok(await SocialService.respond(user.id, solicitanteId, aceitar))
  },
  { rateLimit: RateLimits.standard },
)
