import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import type { anotacaoCreateSchema, anotacaoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof anotacaoCreateSchema>
type UpdateInput = z.infer<typeof anotacaoUpdateSchema>

async function getOwned(ownerId: string, id: string) {
  const note = await runById(
    () => prisma.anotacao.findFirst({ where: { id, ownerId } }),
    'Anotação não encontrada',
  )
  if (!note) throw ApiErrors.notFound('Anotação não encontrada')
  return note
}

export const AnotacaoService = {
  list: (ownerId: string) =>
    prisma.anotacao.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } }),

  create: (ownerId: string, data: CreateInput) => prisma.anotacao.create({ data: { ...data, ownerId } }),

  update: async (ownerId: string, id: string, data: UpdateInput) => {
    await getOwned(ownerId, id)
    return runById(
      () => prisma.anotacao.update({ where: { id }, data }),
      'Anotação não encontrada',
    )
  },

  remove: async (ownerId: string, id: string) => {
    await getOwned(ownerId, id)
    return runById(() => prisma.anotacao.delete({ where: { id } }), 'Anotação não encontrada')
  },
}
