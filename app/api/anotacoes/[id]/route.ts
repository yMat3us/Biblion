import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, anotacaoUpdateSchema } from '@/lib/validation'
import { AnotacaoService } from '@/lib/services/anotacao'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const data = await parseJson(req, anotacaoUpdateSchema)
    return ok(await AnotacaoService.update(user.id, id, data))
  },
  { rateLimit: RateLimits.standard },
)

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await AnotacaoService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
