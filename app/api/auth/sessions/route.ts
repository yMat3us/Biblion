import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { listUserSessions } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/auth-constants'
import { RateLimits } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Lista as sessões ativas do usuário (dispositivos). DTO seguro, sem tokenHash.
export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const sessions = await listUserSessions(user.id, req.cookies.get(SESSION_COOKIE)?.value)
    return ok({ sessions })
  },
  { rateLimit: RateLimits.standard },
)
