import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { route } from '@/lib/route'
import { created, ApiErrors } from '@/lib/http'
import { parseJson } from '@/lib/validation'
import { RateLimits } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
    const { id } = await params
    const { inviteeId } = await parseJson(req, z.object({ inviteeId: z.string().length(24) }))

    const plano = await prisma.readingPlan.findUnique({
      where: { id },
      include: { _count: { select: { invitations: true } } }
    })
    
    if (!plano) throw ApiErrors.notFound('Plano não encontrado')
    if (plano.ownerId !== user.id) throw ApiErrors.forbidden('Apenas o dono pode convidar')
    if (plano._count.invitations >= 10) throw ApiErrors.badRequest('Limite máximo de 10 convites atingido')

    // Verificar se já existe convite
    const existing = await prisma.planInvitation.findUnique({
      where: { planId_inviteeId: { planId: id, inviteeId } }
    })
    
    if (existing) {
      if (existing.status === 'PENDING') throw ApiErrors.badRequest('Convite já enviado e pendente')
      if (existing.status === 'ACCEPTED') throw ApiErrors.badRequest('Usuário já aceitou e está no plano')
      // Se DECLINED, pode re-enviar (atualizando status para PENDING)
      await prisma.planInvitation.update({
        where: { id: existing.id },
        data: { status: 'PENDING', respondedAt: null }
      })
    } else {
      await prisma.planInvitation.create({
        data: {
          planId: id,
          inviterId: user.id,
          inviteeId,
          status: 'PENDING'
        }
      })
    }
    
    // Send Notification to the invitee
    await prisma.notification.create({
      data: {
        userId: inviteeId,
        actorId: user.id,
        type: NotificationType.PLAN_SHARED,
        payload: JSON.stringify({ planId: id, planTitle: plano.titulo })
      }
    })

    return created({ success: true })
  },
  { rateLimit: RateLimits.standard }
)
