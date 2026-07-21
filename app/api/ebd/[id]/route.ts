import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, licaoUpdateSchema } from '@/lib/validation'
import { LicaoService } from '@/lib/services/ebd'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const GET = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    return ok(await LicaoService.get(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const { topicos, perguntas, ...rest } = await parseJson(req, licaoUpdateSchema)
    const data: Prisma.LicaoEBDUpdateManyMutationInput = { ...rest }
    if (topicos !== undefined) data.topicos = typeof topicos === 'string' ? topicos : JSON.stringify(topicos)
    if (perguntas !== undefined) data.perguntas = typeof perguntas === 'string' ? perguntas : JSON.stringify(perguntas)
    return ok(await LicaoService.update(user.id, id, data))
  },
  { rateLimit: RateLimits.standard },
)

export const DELETE = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    await LicaoService.remove(user.id, id)
    return ok({ success: true })
  },
  { rateLimit: RateLimits.standard },
)
