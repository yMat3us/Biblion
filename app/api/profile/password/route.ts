import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, changePasswordSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { clearedSessionCookie, createUserSession, sessionCookie } from '@/lib/auth'
import { RateLimits } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

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
      logger.error('password_changed_session_recreate_failed', { error })
      const response = ok({ success: true, reauthRequired: true })
      response.cookies.set(clearedSessionCookie())
      return response
    }
  },
  { rateLimit: RateLimits.auth },
)
