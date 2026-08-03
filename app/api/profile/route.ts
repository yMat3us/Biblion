import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, profileUpdateSchema, accountDeleteSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { AccountService } from '@/lib/services/account'
import { clearedSessionCookie } from '@/lib/auth'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => ok({ user }),
  { rateLimit: RateLimits.standard },
)

export const PUT = route(
  async (req: NextRequest, _ctx, user) => {
    const input = await parseJson(req, profileUpdateSchema)
    const updatedUser = await UserService.updateProfile(user.id, input)
    const response = ok({ user: updatedUser })
    response.cookies.set('biblion_theme', updatedUser.accentColor, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return response
  },
  { rateLimit: RateLimits.standard },
)

// Exclusão da própria conta (LGPD): reautentica por senha, anonimiza os dados e
// limpa o cookie de sessão. Rate limit apertado (auth) por ser sensível.
export const DELETE = route(
  async (req: NextRequest, _ctx, user) => {
    const { password } = await parseJson(req, accountDeleteSchema)
    await AccountService.deleteAccount(user.id, password)
    const response = ok({ success: true })
    response.cookies.set(clearedSessionCookie())
    return response
  },
  { rateLimit: RateLimits.auth },
)
