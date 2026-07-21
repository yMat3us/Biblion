import type { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { route } from '@/lib/route'
import { created, ok } from '@/lib/http'
import { requireRole } from '@/lib/auth'
import { parseJson, accountCreateSchema } from '@/lib/validation'
import { UserService } from '@/lib/services/user'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => {
    requireRole(user, UserRole.OWNER, UserRole.ADMIN)
    return ok(await UserService.list())
  },
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    requireRole(user, UserRole.OWNER, UserRole.ADMIN)
    const input = await parseJson(req, accountCreateSchema)
    return created(await UserService.create(user, input))
  },
  { rateLimit: RateLimits.auth },
)
