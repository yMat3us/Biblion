import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { amigosListaQuerySchema } from '@/lib/validation'
import { SocialService } from '@/lib/services/social'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const { escopo } = amigosListaQuerySchema.parse({ escopo: req.nextUrl.searchParams.get('escopo') ?? undefined })
    if (escopo === 'recebidas') return ok({ usuarios: await SocialService.listPendingReceived(user.id) })
    if (escopo === 'enviadas') return ok({ usuarios: await SocialService.listPendingSent(user.id) })
    return ok({ usuarios: await SocialService.listFriends(user.id) })
  },
  { rateLimit: RateLimits.standard },
)
