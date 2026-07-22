import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, aiPlanoSchema } from '@/lib/validation'
import { generateReadingPlan } from '@/lib/ai'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { tema, dias, visibility } = await parseJson(req, aiPlanoSchema)

    // Verificação de duplicação ANTES de gerar: economiza custo de IA e evita
    // planos repetidos. Se o usuário já tem um plano semelhante, devolvemos ele.
    const similar = await PlanoService.findSimilar(user.id, tema)
    if (similar) return ok({ planId: similar.id, jaExistia: true })

    const generated = await generateReadingPlan({ tema, dias })
    const plan = await PlanoService.createFromAI(user.id, generated, visibility)
    return created({ planId: plan.id, jaExistia: false })
  },
  { rateLimit: RateLimits.ai },
)
