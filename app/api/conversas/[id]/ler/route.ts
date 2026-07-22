import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { ChatService } from '@/lib/services/chat'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    return ok(await ChatService.markRead(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)
