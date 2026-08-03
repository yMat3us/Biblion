import type { NextRequest } from 'next/server'
import { EnrollmentStatus } from '@prisma/client'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, planoCreateSchema, planoListQuerySchema } from '@/lib/validation'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const params = req.nextUrl.searchParams
    const { escopo, categoria, q } = planoListQuerySchema.parse({
      escopo: params.get('escopo') ?? undefined,
      categoria: params.get('categoria') ?? undefined,
      q: params.get('q') ?? undefined,
    })

    if (escopo === 'meus') return ok({ planos: await PlanoService.listEnrolled(user.id, EnrollmentStatus.ACTIVE) })
    if (escopo === 'concluidos') return ok({ planos: await PlanoService.listEnrolled(user.id, EnrollmentStatus.COMPLETED) })
    if (escopo === 'criados') return ok({ planos: await PlanoService.listCreated(user.id) })

    const [planos, categorias] = await Promise.all([
      PlanoService.listCatalog(user.id, { categoria, q }),
      PlanoService.categorias(),
    ])
    return ok({ planos, categorias })
  },
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const data = await parseJson(req, planoCreateSchema)
    return created(await PlanoService.create(user.id, data))
  },
  { rateLimit: RateLimits.standard },
)
