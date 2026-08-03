import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { getHino, getNeighbors, listHinos } from '@/lib/harpa'

/**
 * Camada de hinos.
 *
 * O conteúdo dos hinos vem do arquivo `Harpa.json` (via `lib/harpa.ts`, em
 * cache), exatamente como as versões da Bíblia. Somente os favoritos são
 * pessoais e ficam no banco, no modelo genérico `Favorito`
 * (`tipo = "hino"`, `referencia = "<hinario>:<numero>"`), sempre por `ownerId`.
 */

const FAVORITE_TYPE = 'hino'

function favoriteRef(hinario: string, numero: number): string {
  return `${hinario}:${numero}`
}

async function favoriteNumbers(ownerId: string, hinario: string): Promise<number[]> {
  const rows = await prisma.favorito.findMany({
    where: { ownerId, tipo: FAVORITE_TYPE, referencia: { startsWith: `${hinario}:` } },
    select: { referencia: true },
  })
  return rows
    .map((row) => Number(row.referencia.split(':')[1]))
    .filter((numero) => Number.isInteger(numero))
}

export interface HinoListResult {
  hinos: Array<{ numero: number; titulo: string; categoria: string | null; autor: string | null }>
  categorias: string[]
  favoritos: number[]
}

export const HinoService = {
  list: async (
    ownerId: string,
    // `categoria` é aceito por compatibilidade de rota, mas a Harpa não tem categorias.
    { hinario, q, favoritos }: { hinario: string; q: string; categoria: string; favoritos: boolean },
  ): Promise<HinoListResult> => {
    const [todos, favoriteSet] = await Promise.all([listHinos(), favoriteNumbers(ownerId, hinario)])

    let hinos = todos
    if (favoritos) {
      const favoritados = new Set(favoriteSet)
      hinos = hinos.filter((hino) => favoritados.has(hino.numero))
    }
    if (q) {
      const termo = q.trim().toLocaleLowerCase('pt-BR')
      const comoNumero = Number(termo)
      hinos = hinos.filter(
        (hino) =>
          hino.titulo.toLocaleLowerCase('pt-BR').includes(termo) ||
          (Number.isInteger(comoNumero) && hino.numero === comoNumero) ||
          String(hino.numero).startsWith(termo),
      )
    }

    // A Harpa não possui categorias no dataset; o parâmetro é mantido por
    // compatibilidade e a lista de categorias fica vazia.
    return {
      hinos: hinos.map((hino) => ({ numero: hino.numero, titulo: hino.titulo, categoria: null, autor: null })),
      categorias: [],
      favoritos: favoriteSet,
    }
  },

  get: async (ownerId: string, hinario: string, numero: number) => {
    const hino = await getHino(numero)
    if (!hino) throw ApiErrors.notFound('Hino não encontrado')

    const [favorito, { anterior, proximo }] = await Promise.all([
      prisma.favorito.findUnique({
        where: { ownerId_tipo_referencia: { ownerId, tipo: FAVORITE_TYPE, referencia: favoriteRef(hinario, numero) } },
        select: { id: true },
      }),
      getNeighbors(numero),
    ])

    return {
      numero: hino.numero,
      titulo: hino.titulo,
      autor: null,
      categoria: null,
      tom: null,
      estrofes: hino.estrofes,
      coro: hino.coro,
      audioUrl: null,
      favorito: Boolean(favorito),
      anterior,
      proximo,
    }
  },

  toggleFavorite: async (ownerId: string, hinario: string, numero: number, favoritar: boolean) => {
    const hino = await getHino(numero)
    if (!hino) throw ApiErrors.notFound('Hino não encontrado')

    const referencia = favoriteRef(hinario, numero)
    if (favoritar) {
      await prisma.favorito.upsert({
        where: { ownerId_tipo_referencia: { ownerId, tipo: FAVORITE_TYPE, referencia } },
        update: { titulo: hino.titulo },
        create: { ownerId, tipo: FAVORITE_TYPE, referencia, titulo: hino.titulo },
      })
    } else {
      await prisma.favorito.deleteMany({ where: { ownerId, tipo: FAVORITE_TYPE, referencia } })
    }
    return { favorited: favoritar }
  },
}
