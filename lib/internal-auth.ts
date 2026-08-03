import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { ApiErrors } from '@/lib/http'

/**
 * Comparação em tempo constante entre dois segredos. Ambos são reduzidos a um
 * digest SHA-256 de tamanho fixo antes do timingSafeEqual, então nem o resultado
 * nem o comprimento das strings vazam por temporização.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/** Extrai o segredo de `Authorization: Bearer <segredo>` ou do header `x-cron-secret`. */
function extractSecret(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || null
  return req.headers.get('x-cron-secret')?.trim() || null
}

/**
 * Autoriza chamadas máquina-a-máquina (cron e jobs internos) por segredo — não por
 * sessão de usuário. Diferente de `route()`, que exige sessão + checagem de origem.
 *
 * Fail-closed: sem `CRON_SECRET` no ambiente (ou fraco demais), a rota é RECUSADA
 * em vez de ficar aberta. O Vercel Cron injeta `Authorization: Bearer $CRON_SECRET`
 * automaticamente; agendadores self-hosted mandam o mesmo header.
 */
export function assertInternalSecret(req: NextRequest): void {
  const expected = process.env.CRON_SECRET
  if (!expected || expected.length < 16) {
    throw ApiErrors.serviceUnavailable('Tarefas internas não configuradas')
  }
  const provided = extractSecret(req)
  if (!provided || !secretsMatch(provided, expected)) {
    throw ApiErrors.unauthorized('Segredo interno inválido')
  }
}
