import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, aiPlanoSchema } from '@/lib/validation'
import { generateReadingPlan, moderatePlanTopic } from '@/lib/ai'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'

// 300 segundos (5 min) caso o Vercel Pro suporte. No hobby isso continua sendo 60s,
// mas dividimos em chunks paralelos para mitigar timeouts.
export const maxDuration = 300

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { tema, dias, visibility, motivo } = await parseJson(req, aiPlanoSchema)

    // Verificação de duplicação ANTES de gerar: economiza custo de IA e evita
    // planos repetidos. Se o usuário já tem um plano semelhante, devolvemos ele.
    const similar = await PlanoService.findSimilar(user.id, tema)
    if (similar) return ok({ planId: similar.id, jaExistia: true })

    const moderation = await moderatePlanTopic(tema)
    const aiWarning = !moderation.isAppropriate
    const aiWarningReason = moderation.reason

    const generated = await generateReadingPlan({ tema, dias })
    const status = dias > 60 ? 'PENDING_APPROVAL' : 'APPROVED'

    const plan = await PlanoService.createFromAI(
      user.id, 
      generated, 
      visibility, 
      status, 
      motivo, 
      aiWarning, 
      aiWarningReason
    )
    
    return created({ planId: plan.id, jaExistia: false, status })
  },
  { rateLimit: RateLimits.ai },
)
