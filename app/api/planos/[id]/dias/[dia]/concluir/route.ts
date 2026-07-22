import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, planoDiaConcluirSchema, planoDiaParamsSchema } from '@/lib/validation'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string; dia: string }> }

export const POST = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id, dia } = await params
    const { dia: diaNumero } = planoDiaParamsSchema.parse({ dia })
    const { concluido } = await parseJson(req, planoDiaConcluirSchema)
    return ok(await PlanoService.completeDay(user.id, id, diaNumero, concluido))
  },
  { rateLimit: RateLimits.standard },
)
