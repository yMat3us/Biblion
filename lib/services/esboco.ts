import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import type { esbocoCreateSchema, esbocoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof esbocoCreateSchema>
type UpdateInput = z.infer<typeof esbocoUpdateSchema>

async function getOwned(ownerId: string, id: string) {
  const outline = await runById(
    () => prisma.esboco.findFirst({ where: { id, ownerId } }),
    'Esboço não encontrado',
  )
  if (!outline) throw ApiErrors.notFound('Esboço não encontrado')
  return outline
}

export const EsbocoService = {
  list: (ownerId: string) =>
    prisma.esboco.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }),

  create: (ownerId: string, data: CreateInput) => prisma.esboco.create({ data: { ...data, ownerId } }),

  update: async (ownerId: string, id: string, data: UpdateInput) => {
    await getOwned(ownerId, id)
    return runById(() => prisma.esboco.update({ where: { id }, data }), 'Esboço não encontrado')
  },

  remove: async (ownerId: string, id: string) => {
    await getOwned(ownerId, id)
    return runById(() => prisma.esboco.delete({ where: { id } }), 'Esboço não encontrado')
  },
}
