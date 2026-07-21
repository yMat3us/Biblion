import type { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { requireRole } from '@/lib/auth'
import { parseJson, accountUpdateSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    requireRole(user, UserRole.OWNER, UserRole.ADMIN)
    const { id } = await params
    const input = await parseJson(req, accountUpdateSchema)
    return ok(await UserService.updateAccount(user, id, input))
  },
  { rateLimit: RateLimits.auth },
)
