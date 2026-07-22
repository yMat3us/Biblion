import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { userSearchSchema } from '@/lib/validation'
import { SocialService } from '@/lib/services/social'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const { q } = userSearchSchema.parse({ q: req.nextUrl.searchParams.get('q') ?? '' })
    return ok({ usuarios: await SocialService.search(user.id, q) })
  },
  { rateLimit: RateLimits.standard },
)
