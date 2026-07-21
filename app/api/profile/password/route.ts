import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, changePasswordSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { clearedSessionCookie, createUserSession, sessionCookie } from '@/lib/auth'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema)
    await UserService.changePassword(user.id, currentPassword, newPassword)

    try {
      const token = await createUserSession(user.id, req)
      const response = ok({ success: true, reauthRequired: false })
      response.cookies.set(sessionCookie(token))
      return response
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'erro desconhecido'
      console.error(`[AUTH] Senha alterada, mas a sessão substituta não pôde ser criada: ${detail}`)
      const response = ok({ success: true, reauthRequired: true })
      response.cookies.set(clearedSessionCookie())
      return response
    }
  },
  { rateLimit: RateLimits.auth },
)
