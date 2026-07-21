import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, profileUpdateSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => ok({ user }),
  { rateLimit: RateLimits.standard },
)

export const PUT = route(
  async (req: NextRequest, _ctx, user) => {
    const input = await parseJson(req, profileUpdateSchema)
    return ok({ user: await UserService.updateProfile(user.id, input) })
  },
  { rateLimit: RateLimits.standard },
)
