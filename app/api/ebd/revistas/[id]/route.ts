import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { RevistaService } from '@/lib/services/ebd'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await RevistaService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
