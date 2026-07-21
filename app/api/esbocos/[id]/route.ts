import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, esbocoUpdateSchema } from '@/lib/validation'
import { EsbocoService } from '@/lib/services/esboco'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const data = await parseJson(req, esbocoUpdateSchema)
    return ok(await EsbocoService.update(user.id, id, data))
  },
  { rateLimit: RateLimits.standard },
)

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await EsbocoService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
