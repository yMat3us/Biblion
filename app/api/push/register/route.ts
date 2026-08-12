import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson } from '@/lib/validation'
import { savePushToken, removePushToken } from '@/lib/push'
import { RateLimits } from '@/lib/rate-limit'

const registerSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
})

const unregisterSchema = z.object({
  token: z.string().trim().min(1).max(4096),
})

// Registra o token FCM do dispositivo, associado ao usuário autenticado, para
// que o servidor possa enviar as atualizações de progresso das análises.
export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { token, platform } = await parseJson(req, registerSchema, { maxBytes: 8_192 })
    await savePushToken(user.id, token, platform)
    return ok({ registered: true })
  },
  { rateLimit: RateLimits.standard },
)

// Remove um token (logout ou revogação de permissão).
export const DELETE = route(
  async (req: NextRequest) => {
    const { token } = await parseJson(req, unregisterSchema, { maxBytes: 8_192 })
    await removePushToken(token)
    return ok({ removed: true })
  },
  { rateLimit: RateLimits.standard },
)
