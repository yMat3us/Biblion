import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveSessionToken, type AuthUser } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export const getPageUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies()
  return resolveSessionToken(cookieStore.get(SESSION_COOKIE)?.value)
})

export async function requirePageUser(): Promise<AuthUser> {
  const user = await getPageUser()
  if (!user) redirect('/login')
  return user
}
