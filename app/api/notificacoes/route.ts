import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { NotificationService } from '@/lib/services/notification'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    // Modo leve para o poller do sino: apenas a contagem de não lidas.
    if (req.nextUrl.searchParams.get('count') === '1') {
      return ok({ naoLidas: await NotificationService.unreadCount(user.id) })
    }
    const [notificacoes, naoLidas] = await Promise.all([
      NotificationService.list(user.id),
      NotificationService.unreadCount(user.id),
    ])
    return ok({ notificacoes, naoLidas })
  },
  { rateLimit: RateLimits.standard },
)
