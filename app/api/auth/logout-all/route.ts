import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { clearedSessionCookie, destroyAllUserSessions } from '@/lib/auth'
import { RateLimits } from '@/lib/rate-limit'

// Revoga TODAS as sessões do usuário (todos os dispositivos) e limpa o cookie atual.
export const POST = route(
  async (_req, _ctx, user) => {
    await destroyAllUserSessions(user.id)
    const response = ok({ success: true })
    response.cookies.set(clearedSessionCookie())
    response.cookies.set('biblion_theme', '', { path: '/', maxAge: 0 })
    return response
  },
  { rateLimit: RateLimits.auth },
)
