import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok, created } from '@/lib/http'
import { parseJson, conversaStartSchema } from '@/lib/validation'
import { ChatService } from '@/lib/services/chat'
import { RateLimits } from '@/lib/rate-limit'

export const GET = route(
  async (_req, _ctx, user) => ok({ conversas: await ChatService.listConversations(user.id) }),
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { alvoId } = await parseJson(req, conversaStartSchema)
    return created(await ChatService.getOrCreateConversation(user.id, alvoId))
  },
  { rateLimit: RateLimits.standard },
)
