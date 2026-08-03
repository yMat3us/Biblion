import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import { cursorArgs, resolveTake, toCursorPage, type CursorPage } from '@/lib/pagination'
import type { sermaoCreateSchema, sermaoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof sermaoCreateSchema>
type UpdateInput = z.infer<typeof sermaoUpdateSchema>
type ListOptions = { cursor?: string | null; q?: string | null; take?: number | null }

// Projeção do card da lista: o corpo do sermão (topicos/conclusao/aplicacao/tags)
// pode ter dezenas de KB e NÃO é exibido na listagem — só nos detalhes. Trazê-lo
// em toda listagem inflava a resposta sem necessidade.
const SERMAO_LIST_SELECT = {
  id: true,
  titulo: true,
  tema: true,
  textoBase: true,
  introducao: true,
  categoria: true,
  publicado: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SermaoSelect

async function findOwned(ownerId: string, id: string) {
  return runById(
    () => prisma.sermao.findFirst({ where: { id, ownerId } }),
    'Sermão não encontrado',
  )
}

type SermaoCard = Prisma.SermaoGetPayload<{ select: typeof SERMAO_LIST_SELECT }>

export const SermaoService = {
  list: async (ownerId: string, options: ListOptions = {}): Promise<CursorPage<SermaoCard>> => {
    const size = resolveTake(options.take)
    const q = options.q?.trim()
    const rows = await prisma.sermao.findMany({
      where: {
        ownerId,
        ...(q
          ? {
              OR: [
                { titulo: { contains: q, mode: 'insensitive' } },
                { tema: { contains: q, mode: 'insensitive' } },
                { textoBase: { contains: q, mode: 'insensitive' } },
                { categoria: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: SERMAO_LIST_SELECT,
      ...cursorArgs(size, options.cursor),
    })
    return toCursorPage(rows, size)
  },

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
