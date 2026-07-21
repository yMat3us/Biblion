import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, sermaoUpdateSchema } from '@/lib/validation'
import { SermaoService } from '@/lib/services/sermao'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const GET = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    return ok(await SermaoService.get(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const data = await parseJson(req, sermaoUpdateSchema)
    return ok(await SermaoService.update(user.id, id, data))
  },
  { rateLimit: RateLimits.standard },
)

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await SermaoService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
