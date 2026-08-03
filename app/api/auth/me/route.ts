import { route } from '@/lib/route'
import { ok } from '@/lib/http'

export const GET = route(async (_req, _ctx, user) => ok({ user }))
