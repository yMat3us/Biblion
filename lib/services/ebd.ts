import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import type { revistaCreateSchema } from '@/lib/validation'

type RevistaCreateInput = z.infer<typeof revistaCreateSchema>
type LicaoCreateInput = Omit<Prisma.LicaoEBDUncheckedCreateInput, 'ownerId'>
type LicaoUpdateInput = Prisma.LicaoEBDUpdateManyMutationInput

async function findRevistaOwned(ownerId: string, id: string) {
  return runById(
    () => prisma.revistaEBD.findFirst({ where: { id, ownerId } }),
    'Revista não encontrada',
  )
}

export const RevistaService = {
  list: (ownerId: string) =>
    prisma.revistaEBD.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        titulo: true,
        trimestre: true,
        ano: true,
        tema: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { licoes: { where: { ownerId } } } },
      },
    }),

  findWithLicoes: (ownerId: string, id: string) =>
    runById(
      () =>
        prisma.revistaEBD.findFirst({
          where: { id, ownerId },
          select: {
            id: true,
            titulo: true,
            trimestre: true,
            ano: true,
            tema: true,
            createdAt: true,
            updatedAt: true,
            licoes: {
              where: { ownerId },
              orderBy: [{ numero: 'asc' }, { createdAt: 'asc' }],
              select: { id: true, numero: true, titulo: true, textoBase: true, data: true },
            },
          },
        }),
      'Revista não encontrada',
    ),

  create: (ownerId: string, data: RevistaCreateInput) =>
    prisma.revistaEBD.create({ data: { ...data, ownerId } }),

  remove: async (ownerId: string, id: string) => {
    const revista = await findRevistaOwned(ownerId, id)
    if (!revista) throw ApiErrors.notFound('Revista não encontrada')
    return runById(() => prisma.revistaEBD.delete({ where: { id } }), 'Revista não encontrada')
  },
}

async function findLicaoOwned(ownerId: string, id: string) {
  return runById(
    () => prisma.licaoEBD.findFirst({ where: { id, ownerId } }),
    'Lição não encontrada',
  )
}

export const LicaoService = {
  find: (ownerId: string, id: string) => findLicaoOwned(ownerId, id),

  get: async (ownerId: string, id: string) => {
    const licao = await findLicaoOwned(ownerId, id)
    if (!licao) throw ApiErrors.notFound('Lição não encontrada')
    return licao
  },

  create: async (ownerId: string, data: LicaoCreateInput) => {
    if (data.revistaId) {
      const revista = await findRevistaOwned(ownerId, data.revistaId)
      if (!revista) throw ApiErrors.notFound('Revista não encontrada')
    }
    return prisma.licaoEBD.create({ data: { ...data, ownerId } })
  },

  update: async (ownerId: string, id: string, data: LicaoUpdateInput) => {
    await LicaoService.get(ownerId, id)
    return runById(() => prisma.licaoEBD.update({ where: { id }, data }), 'Lição não encontrada')
  },

  remove: async (ownerId: string, id: string) => {
    await LicaoService.get(ownerId, id)
    return runById(() => prisma.licaoEBD.delete({ where: { id } }), 'Lição não encontrada')
  },

  listSummaries: (ownerId: string) =>
    prisma.licaoEBD.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, titulo: true, textoBase: true, createdAt: true },
    }),

  search: (ownerId: string, query: string, take = 5) =>
    prisma.licaoEBD.findMany({
      where: {
        ownerId,
        OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { textoBase: { contains: query, mode: 'insensitive' } },
          { revista: { is: { ownerId, tema: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        textoBase: true,
        data: true,
        revista: { select: { tema: true } },
      },
      take,
    }),
}
