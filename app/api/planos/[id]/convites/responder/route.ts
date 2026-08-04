import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { route } from '@/lib/route'
import { ok, ApiErrors } from '@/lib/http'
import { parseJson } from '@/lib/validation'
import { RateLimits } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { EnrollmentStatus } from '@prisma/client'

export const POST = route(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, user) => {
    const { id } = await params
    const { accept } = await parseJson(req, z.object({ accept: z.boolean() }))

    const invitation = await prisma.planInvitation.findUnique({
      where: { planId_inviteeId: { planId: id, inviteeId: user.id } }
    })

    if (!invitation) throw ApiErrors.notFound('Convite não encontrado')
    if (invitation.status !== 'PENDING') throw ApiErrors.badRequest('O convite já foi respondido')

    if (accept) {
      await prisma.$transaction([
        prisma.planInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() }
        }),
        prisma.planEnrollment.upsert({
          where: { userId_planId: { userId: user.id, planId: id } },
          update: { status: EnrollmentStatus.ACTIVE },
          create: { userId: user.id, planId: id, status: EnrollmentStatus.ACTIVE, diaAtual: 1 }
        })
      ])
    } else {
      await prisma.planInvitation.update({
        where: { id: invitation.id },
        data: { status: 'DECLINED', respondedAt: new Date() }
      })
    }

    return ok({ success: true, accepted: accept })
  },
  { rateLimit: RateLimits.standard }
)
