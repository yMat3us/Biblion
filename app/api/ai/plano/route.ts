import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { parseJson, aiPlanoSchema } from '@/lib/validation'
import { generateReadingPlan, moderatePlanTopic } from '@/lib/ai'
import { PlanoService } from '@/lib/services/plano'
import { RateLimits } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

export const maxDuration = 300

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { tema, dias, visibility, motivo } = await parseJson(req, aiPlanoSchema)

    const similar = await PlanoService.findSimilar(user.id, tema)
    if (similar) return ok({ planId: similar.id, jaExistia: true })

    const moderation = await moderatePlanTopic(tema)
    const aiWarning = !moderation.isAppropriate
    const aiWarningReason = moderation.reason

    const status = dias > 60 ? 'PENDING_APPROVAL' : 'APPROVED'

    // Cria o plano VAZIO no banco de dados imediatamente!
    const plan = await prisma.readingPlan.create({
      data: {
        ownerId: user.id,
        titulo: tema,
        descricao: 'A inteligência artificial está escrevendo este plano...',
        categoria: 'Gerando...',
        visibility,
        source: 'AI',
        status,
        approvalReason: motivo,
        aiWarning,
        aiWarningReason,
        duracaoDias: dias, // O frontend vai saber que não acabou enquanto os dias salvos forem menores que isso!
      }
    })
    
    // Roda a IA em BACKGROUND (floating promise), enviando os dias para o DB em tempo real!
    generateReadingPlan({
      tema,
      dias,
      onBatchGenerated: async (batch) => {
        // Salva os dias desse lote no banco
        await prisma.planDay.createMany({
          data: batch.map(dia => ({
            planId: plan.id,
            dia: dia.dia,
            titulo: dia.titulo,
            referencia: dia.referencia,
            reflexao: dia.reflexao,
            pergunta: dia.pergunta,
            acao: dia.acao,
            oracao: dia.oracao
          }))
        })
      }
    }).then(async (finalPlan) => {
      // Quando tudo terminar, atualiza o título e a descrição reais
      await prisma.readingPlan.update({
        where: { id: plan.id },
        data: {
          titulo: finalPlan.titulo || tema,
          descricao: finalPlan.descricao || '',
          categoria: finalPlan.categoria || ''
        }
      })
    }).catch(console.error)
    
    // Retorna a resposta imediatamente (UX de 1 segundo)
    return created({ planId: plan.id, jaExistia: false, status })
  },
  { rateLimit: RateLimits.ai },
)
