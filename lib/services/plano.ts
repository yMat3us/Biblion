import { EnrollmentStatus, Prisma, PlanSource, Visibility } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import type { planoCreateSchema, planoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof planoCreateSchema>
type UpdateInput = z.infer<typeof planoUpdateSchema>
type GeneratedPlan = Omit<CreateInput, 'visibility'>

const FAVORITE_TYPE = 'plano'

const PLAN_CARD_SELECT = {
  id: true,
  titulo: true,
  descricao: true,
  categoria: true,
  capaCor: true,
  duracaoDias: true,
  visibility: true,
  oficial: true,
  source: true,
  ownerId: true,
  updatedAt: true,
  owner: { select: { displayName: true, username: true, publicId: true } },
} satisfies Prisma.ReadingPlanSelect

/**
 * Um plano é visível quando: pertence ao usuário, é PÚBLICO, ou é oficial.
 * FRIENDS ainda NÃO concede acesso (o sistema de amizades não existe), então
 * planos FRIENDS de terceiros permanecem invisíveis — falha fechada.
 * Qualquer recurso fora deste escopo retorna 404 (anti-enumeração), como no
 * resto da aplicação.
 */
function viewableWhere(userId: string): Prisma.ReadingPlanWhereInput {
  return { OR: [{ ownerId: userId }, { visibility: Visibility.PUBLIC }, { oficial: true }] }
}

type PlanCard = Prisma.ReadingPlanGetPayload<{ select: typeof PLAN_CARD_SELECT }>

async function decorate(userId: string, plans: PlanCard[]) {
  const ids = plans.map((plan) => plan.id)
  if (ids.length === 0) return []

  const [favoritos, matriculas] = await Promise.all([
    prisma.favorito.findMany({
      where: { ownerId: userId, tipo: FAVORITE_TYPE, referencia: { in: ids } },
      select: { referencia: true },
    }),
    prisma.planEnrollment.findMany({
      where: { userId, planId: { in: ids } },
      select: { planId: true, status: true, diaAtual: true },
    }),
  ])

  const favoritados = new Set(favoritos.map((row) => row.referencia))
  const porPlano = new Map(matriculas.map((row) => [row.planId, { status: row.status, diaAtual: row.diaAtual }]))

  return plans.map((plan) => ({
    ...plan,
    isOwner: plan.ownerId === userId,
    favorito: favoritados.has(plan.id),
    matricula: porPlano.get(plan.id) ?? null,
  }))
}

async function assertViewable(userId: string, planId: string) {
  const plan = await runById(
    () => prisma.readingPlan.findFirst({ where: { id: planId, ...viewableWhere(userId) }, select: { id: true, titulo: true } }),
    'Plano não encontrado',
  )
  if (!plan) throw ApiErrors.notFound('Plano não encontrado')
  return plan
}

async function assertOwned(userId: string, planId: string) {
  const plan = await runById(
    () => prisma.readingPlan.findFirst({ where: { id: planId, ownerId: userId }, select: { id: true } }),
    'Plano não encontrado',
  )
  if (!plan) throw ApiErrors.notFound('Plano não encontrado')
  return plan
}

function persistPlan(userId: string, source: PlanSource, data: CreateInput) {
  const { dias, visibility, descricao, categoria, capaCor, titulo } = data
  return prisma.readingPlan.create({
    data: {
      ownerId: userId,
      titulo,
      descricao: descricao ?? null,
      categoria: categoria ?? null,
      capaCor: capaCor ?? null,
      visibility,
      source,
      duracaoDias: dias.length,
      dias: {
        create: dias.map((dia) => ({
          dia: dia.dia,
          titulo: dia.titulo ?? null,
          referencia: dia.referencia,
          reflexao: dia.reflexao,
          pergunta: dia.pergunta ?? null,
          acao: dia.acao ?? null,
          oracao: dia.oracao ?? null,
        })),
      },
    },
    select: { id: true },
  })
}

export const PlanoService = {
  listCatalog: async (userId: string, { categoria, q }: { categoria: string; q: string }) => {
    const conditions: Prisma.ReadingPlanWhereInput[] = [
      { OR: [{ visibility: Visibility.PUBLIC }, { oficial: true }] },
    ]
    if (categoria) conditions.push({ categoria })
    if (q) {
      conditions.push({
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { descricao: { contains: q, mode: 'insensitive' } },
        ],
      })
    }

    const plans = await prisma.readingPlan.findMany({
      where: { AND: conditions },
      orderBy: [{ oficial: 'desc' }, { updatedAt: 'desc' }],
      take: 60,
      select: PLAN_CARD_SELECT,
    })
    return decorate(userId, plans)
  },

  listCreated: async (userId: string) => {
    const plans = await prisma.readingPlan.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: PLAN_CARD_SELECT,
    })
    return decorate(userId, plans)
  },

  listEnrolled: async (userId: string, status: EnrollmentStatus) => {
    const enrollments = await prisma.planEnrollment.findMany({
      where: { userId, status },
      orderBy: { lastActivityAt: 'desc' },
      take: 100,
      select: { status: true, diaAtual: true, plan: { select: PLAN_CARD_SELECT } },
    })
    return enrollments.map((enrollment) => ({
      ...enrollment.plan,
      isOwner: enrollment.plan.ownerId === userId,
      favorito: false,
      matricula: { status: enrollment.status, diaAtual: enrollment.diaAtual },
    }))
  },

  categorias: async () => {
    const rows = await prisma.readingPlan.findMany({
      where: { OR: [{ visibility: Visibility.PUBLIC }, { oficial: true }], categoria: { not: null } },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
      select: { categoria: true },
    })
    return rows.map((row) => row.categoria).filter((value): value is string => Boolean(value))
  },

  get: async (userId: string, planId: string) => {
    const plan = await runById(
      () =>
        prisma.readingPlan.findFirst({
          where: { id: planId, ...viewableWhere(userId) },
          include: {
            owner: { select: { displayName: true, username: true, publicId: true } },
            dias: { orderBy: { dia: 'asc' } },
          },
        }),
      'Plano não encontrado',
    )
    if (!plan) throw ApiErrors.notFound('Plano não encontrado')

    const [enrollment, favorito] = await Promise.all([
      prisma.planEnrollment.findUnique({
        where: { userId_planId: { userId, planId } },
        select: { status: true, diaAtual: true, startedAt: true, completedAt: true, progresso: { select: { dia: true } } },
      }),
      prisma.favorito.findUnique({
        where: { ownerId_tipo_referencia: { ownerId: userId, tipo: FAVORITE_TYPE, referencia: planId } },
        select: { id: true },
      }),
    ])

    return {
      ...plan,
      isOwner: plan.ownerId === userId,
      favorito: Boolean(favorito),
      matricula: enrollment ? { status: enrollment.status, diaAtual: enrollment.diaAtual } : null,
      diasConcluidos: enrollment?.progresso.map((row) => row.dia) ?? [],
    }
  },

  create: (userId: string, data: CreateInput) => persistPlan(userId, PlanSource.USER, data),

  createFromAI: (userId: string, generated: GeneratedPlan, visibility: CreateInput['visibility']) =>
    persistPlan(userId, PlanSource.AI, { ...generated, visibility }),

  update: async (userId: string, planId: string, data: UpdateInput) => {
    await assertOwned(userId, planId)
    const { dias, descricao, categoria, capaCor, ...rest } = data

    const meta: Prisma.ReadingPlanUpdateInput = { ...rest }
    if (descricao !== undefined) meta.descricao = descricao
    if (categoria !== undefined) meta.categoria = categoria
    if (capaCor !== undefined) meta.capaCor = capaCor

    if (dias) {
      meta.duracaoDias = dias.length
      await prisma.planDay.deleteMany({ where: { planId } })
      meta.dias = {
        create: dias.map((dia) => ({
          dia: dia.dia,
          titulo: dia.titulo ?? null,
          referencia: dia.referencia,
          reflexao: dia.reflexao,
          pergunta: dia.pergunta ?? null,
          acao: dia.acao ?? null,
          oracao: dia.oracao ?? null,
        })),
      }
    }

    return runById(
      () => prisma.readingPlan.update({ where: { id: planId }, data: meta, select: { id: true } }),
      'Plano não encontrado',
    )
  },

  remove: async (userId: string, planId: string) => {
    await assertOwned(userId, planId)
    await prisma.favorito.deleteMany({ where: { tipo: FAVORITE_TYPE, referencia: planId } })
    return runById(() => prisma.readingPlan.delete({ where: { id: planId } }), 'Plano não encontrado')
  },

  enroll: async (userId: string, planId: string) => {
    await assertViewable(userId, planId)
    const enrollment = await prisma.planEnrollment.upsert({
      where: { userId_planId: { userId, planId } },
      update: { lastActivityAt: new Date() },
      create: { userId, planId, status: EnrollmentStatus.ACTIVE, diaAtual: 1 },
      select: { status: true, diaAtual: true },
    })
    return enrollment
  },

  completeDay: async (userId: string, planId: string, dia: number, concluido: boolean) => {
    const enrollment = await prisma.planEnrollment.findUnique({
      where: { userId_planId: { userId, planId } },
      select: { id: true },
    })
    if (!enrollment) throw ApiErrors.badRequest('Comece o plano antes de registrar progresso')

    const plan = await prisma.readingPlan.findUnique({ where: { id: planId }, select: { duracaoDias: true } })
    if (!plan) throw ApiErrors.notFound('Plano não encontrado')
    if (dia < 1 || dia > plan.duracaoDias) throw ApiErrors.badRequest('Dia inválido para este plano')

    if (concluido) {
      await prisma.dayProgress.upsert({
        where: { enrollmentId_dia: { enrollmentId: enrollment.id, dia } },
        update: {},
        create: { enrollmentId: enrollment.id, dia },
      })
    } else {
      await prisma.dayProgress.deleteMany({ where: { enrollmentId: enrollment.id, dia } })
    }

    const concluidos = await prisma.dayProgress.count({ where: { enrollmentId: enrollment.id } })
    const finalizado = concluidos >= plan.duracaoDias
    await prisma.planEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: finalizado ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        completedAt: finalizado ? new Date() : null,
        diaAtual: Math.min(plan.duracaoDias, concluidos + 1),
        lastActivityAt: new Date(),
      },
    })

    return { concluidos, finalizado }
  },

  toggleFavorite: async (userId: string, planId: string, favoritar: boolean) => {
    const plan = await assertViewable(userId, planId)
    if (favoritar) {
      await prisma.favorito.upsert({
        where: { ownerId_tipo_referencia: { ownerId: userId, tipo: FAVORITE_TYPE, referencia: planId } },
        update: { titulo: plan.titulo },
        create: { ownerId: userId, tipo: FAVORITE_TYPE, referencia: planId, titulo: plan.titulo },
      })
    } else {
      await prisma.favorito.deleteMany({ where: { ownerId: userId, tipo: FAVORITE_TYPE, referencia: planId } })
    }
    return { favorited: favoritar }
  },

  /** Heurística de deduplicação: evita gerar por IA um plano que o usuário já possui. */
  findSimilar: (userId: string, tema: string) =>
    prisma.readingPlan.findFirst({
      where: { ownerId: userId, titulo: { contains: tema, mode: 'insensitive' } },
      select: { id: true, titulo: true },
    }),
}
