import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { conversaSinceSchema } from '@/lib/validation'
import { ChatService } from '@/lib/services/chat'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const GET = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const { since } = conversaSinceSchema.parse({ since: req.nextUrl.searchParams.get('since') ?? undefined })
    if (since) return ok(await ChatService.messagesSince(user.id, id, since))
    return ok(await ChatService.getConversation(user.id, id))
  },
  { rateLimit: RateLimits.standard },
)
