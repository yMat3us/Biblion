import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, planoUpdateSchema } from '@/lib/validation'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const GET = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    return ok(await PlanoService.get(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const data = await parseJson(req, planoUpdateSchema)
    return ok(await PlanoService.update(user.id, id, data))
  },
  { rateLimit: RateLimits.standard },
)

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await PlanoService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
