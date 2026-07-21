import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { clearedSessionCookie, destroySessionToken } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export const POST = route(async (req: NextRequest) => {
  await destroySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  const response = ok({ success: true })
  response.cookies.set(clearedSessionCookie())
  return response
})
