import 'server-only'

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveSessionToken, type AuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export const getPageUser = cache(async (): Promise<AuthUser | null> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  // Passa o User-Agent para a checagem de anomalia (mesma proteção das rotas de API).
  return resolveSessionToken(cookieStore.get(SESSION_COOKIE)?.value, headerStore.get('user-agent'))
})

export async function requirePageUser(): Promise<AuthUser> {
  const user = await getPageUser()
  if (!user) redirect('/login')
  return user
}

/** AuthUser + avatarUrl. O avatar sai do AUTH_USER_SELECT (que roda em toda
 *  requisição) porque pode ser um data URL grande; aqui é buscado à parte, apenas
 *  para as páginas que realmente exibem/editam o avatar (layout e perfil). */
export type PageUserWithAvatar = AuthUser & { avatarUrl: string | null }

export const getPageUserWithAvatar = cache(async (): Promise<PageUserWithAvatar | null> => {
  const user = await getPageUser()
  if (!user) return null
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } })
  return { ...user, avatarUrl: row?.avatarUrl ?? null }
})

export async function requirePageUserWithAvatar(): Promise<PageUserWithAvatar> {
  const user = await getPageUserWithAvatar()
  if (!user) redirect('/login')
  return user
}
