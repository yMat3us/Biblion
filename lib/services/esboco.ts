import { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { runById } from '@/lib/services/prisma-errors'
import { cursorArgs, resolveTake, toCursorPage, type CursorPage } from '@/lib/pagination'
import type { esbocoCreateSchema, esbocoUpdateSchema } from '@/lib/validation'

type CreateInput = z.infer<typeof esbocoCreateSchema>
type UpdateInput = z.infer<typeof esbocoUpdateSchema>
type ListOptions = { cursor?: string | null; q?: string | null; take?: number | null }

// Projeção da lista: o cliente renderiza os blocos e a prévia a partir de
// `conteudo`, então ele fica; descartamos os campos que a listagem não usa
// (modelo, visibility, updatedAt).
const ESBOCO_LIST_SELECT = {
  id: true,
  titulo: true,
  textoBase: true,
  conteudo: true,
  categoria: true,
  createdAt: true,
} satisfies Prisma.EsbocoSelect

async function getOwned(ownerId: string, id: string) {
  const outline = await runById(
    () => prisma.esboco.findFirst({ where: { id, ownerId } }),
    'Esboço não encontrado',
  )
  if (!outline) throw ApiErrors.notFound('Esboço não encontrado')
  return outline
}

type EsbocoCard = Prisma.EsbocoGetPayload<{ select: typeof ESBOCO_LIST_SELECT }>

export const EsbocoService = {
  list: async (ownerId: string, options: ListOptions = {}): Promise<CursorPage<EsbocoCard>> => {
    const size = resolveTake(options.take)
    const q = options.q?.trim()
    const rows = await prisma.esboco.findMany({
      where: {
        ownerId,
        ...(q
          ? {
              OR: [
                { titulo: { contains: q, mode: 'insensitive' } },
                { textoBase: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: ESBOCO_LIST_SELECT,
      ...cursorArgs(size, options.cursor),
    })
    return toCursorPage(rows, size)
  },

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
