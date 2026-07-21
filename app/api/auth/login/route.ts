import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ApiErrors, ok } from '@/lib/http'
import { parseJson, loginSchema } from '@/lib/validation'
import { authenticateCredentials, createUserSession, sessionCookie } from '@/lib/auth'
import { normalizeUsername } from '@/lib/password'
import { rateLimit, RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest) => {
    const { username, password } = await parseJson(req, loginSchema)
    const accountLimit = await rateLimit(
      `login-account:${normalizeUsername(username)}`,
      RateLimits.authAccount.limit,
      RateLimits.authAccount.windowMs,
    )
    if (!accountLimit.ok) {
      throw ApiErrors.tooManyRequests('Muitas tentativas para esta conta', accountLimit.retryAfterSeconds)
    }

    const user = await authenticateCredentials(username, password)
    if (!user) throw ApiErrors.unauthorized('Usuário ou senha inválidos')

    const token = await createUserSession(user.id, req)
    const response = ok({ user })
    response.cookies.set(sessionCookie(token))
    return response
  },
  { auth: false, rateLimit: RateLimits.auth },
)
