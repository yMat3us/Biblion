import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import type { sermaoCreateSchema, sermaoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof sermaoCreateSchema>
type UpdateInput = z.infer<typeof sermaoUpdateSchema>

async function findOwned(ownerId: string, id: string) {
  return runById(
    () => prisma.sermao.findFirst({ where: { id, ownerId } }),
    'Sermão não encontrado',
  )
}

export const SermaoService = {
  list: (ownerId: string) =>
    prisma.sermao.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }),

  find: (ownerId: string, id: string) => findOwned(ownerId, id),

  get: async (ownerId: string, id: string) => {
    const sermao = await findOwned(ownerId, id)
    if (!sermao) throw ApiErrors.notFound('Sermão não encontrado')
    return sermao
  },

  create: (ownerId: string, data: CreateInput) => prisma.sermao.create({ data: { ...data, ownerId } }),

  update: async (ownerId: string, id: string, data: UpdateInput) => {
    await SermaoService.get(ownerId, id)
    return runById(
      () => prisma.sermao.update({ where: { id }, data }),
      'Sermão não encontrado',
    )
  },

  remove: async (ownerId: string, id: string) => {
    await SermaoService.get(ownerId, id)
    return runById(() => prisma.sermao.delete({ where: { id } }), 'Sermão não encontrado')
  },

  search: (ownerId: string, query: string, take = 5) =>
    prisma.sermao.findMany({
      where: {
        ownerId,
        OR: [
          { titulo: { contains: query, mode: 'insensitive' } },
          { tema: { contains: query, mode: 'insensitive' } },
          { textoBase: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, titulo: true, tema: true, textoBase: true, createdAt: true },
      take,
    }),
}
