import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, notificacaoLerSchema } from '@/lib/validation'
import { NotificationService } from '@/lib/services/notification'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { id } = await parseJson(req, notificacaoLerSchema)
    return ok(await NotificationService.markRead(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)
