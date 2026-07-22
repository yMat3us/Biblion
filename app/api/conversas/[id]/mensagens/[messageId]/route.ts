import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { ChatService } from '@/lib/services/chat'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string; messageId: string }> }

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id, messageId } = await params
    return ok(await ChatService.deleteMessage(user.id, id, messageId))
  },
  { rateLimit: RateLimits.standard },
)
