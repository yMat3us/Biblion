import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, amigoRemoverSchema } from '@/lib/validation'
import { SocialService } from '@/lib/services/social'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { alvoId } = await parseJson(req, amigoRemoverSchema)
    return ok(await SocialService.removeFriend(user.id, alvoId))
  },
  { rateLimit: RateLimits.standard },
)
