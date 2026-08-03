/**
 * Paginação por cursor, estável e reutilizável pelas listagens escopadas por
 * dono. O cursor é o `id` do último item; a ordenação inclui o `id` como
 * desempate para ser determinística. Buscamos `take + 1` para saber, sem uma
 * contagem extra, se existe próxima página.
 */
export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
}

export const DEFAULT_PAGE_SIZE = 60
export const MAX_PAGE_SIZE = 100

/** Normaliza o tamanho de página pedido para o intervalo [1, MAX_PAGE_SIZE]. */
export function resolveTake(take?: number | null): number {
  if (!take || Number.isNaN(take)) return DEFAULT_PAGE_SIZE
  return Math.min(Math.max(1, Math.trunc(take)), MAX_PAGE_SIZE)
}

/**
 * Argumentos de cursor para o Prisma. Sempre pede `size + 1` linhas; quando há
 * cursor, pula o próprio item do cursor (`skip: 1`).
 */
export function cursorArgs(size: number, cursor?: string | null): { take: number; skip?: number; cursor?: { id: string } } {
  return cursor ? { take: size + 1, skip: 1, cursor: { id: cursor } } : { take: size + 1 }
}

/**
 * Converte as linhas cruas (buscadas com `size + 1`) em uma página com cursor.
 * Se vieram mais que `size`, há próxima página e o cursor é o id do último item.
 */
export function toCursorPage<T extends { id: string }>(rows: T[], size: number): CursorPage<T> {
  const hasMore = rows.length > size
  const items = hasMore ? rows.slice(0, size) : rows
  const last = items[items.length - 1]
  return { items, nextCursor: hasMore && last ? last.id : null }
}
