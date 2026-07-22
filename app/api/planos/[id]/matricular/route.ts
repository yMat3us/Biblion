import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    return ok(await PlanoService.enroll(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)
