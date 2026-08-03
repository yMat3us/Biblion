import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import { cursorArgs, resolveTake, toCursorPage, type CursorPage } from '@/lib/pagination'
import type { anotacaoCreateSchema, anotacaoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof anotacaoCreateSchema>
type UpdateInput = z.infer<typeof anotacaoUpdateSchema>
type ListOptions = { cursor?: string | null; q?: string | null; take?: number | null }

// Projeção da lista: o card exibe título, conteúdo (prévia), tags, cor e fixação.
// Descartamos os campos de referência bíblica e visibility que a listagem não usa.
const ANOTACAO_LIST_SELECT = {
  id: true,
  titulo: true,
  conteudo: true,
  tags: true,
  fixada: true,
  cor: true,
  createdAt: true,
} satisfies Prisma.AnotacaoSelect

async function getOwned(ownerId: string, id: string) {
  const note = await runById(
    () => prisma.anotacao.findFirst({ where: { id, ownerId } }),
    'Anotação não encontrada',
  )
  if (!note) throw ApiErrors.notFound('Anotação não encontrada')
  return note
}

type AnotacaoCard = Prisma.AnotacaoGetPayload<{ select: typeof ANOTACAO_LIST_SELECT }>

export const AnotacaoService = {
  list: async (ownerId: string, options: ListOptions = {}): Promise<CursorPage<AnotacaoCard>> => {
    const size = resolveTake(options.take)
    const q = options.q?.trim()
    const rows = await prisma.anotacao.findMany({
      where: {
        ownerId,
        ...(q
          ? {
              OR: [
                { titulo: { contains: q, mode: 'insensitive' } },
                { conteudo: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: ANOTACAO_LIST_SELECT,
      ...cursorArgs(size, options.cursor),
    })
    return toCursorPage(rows, size)
  },

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
