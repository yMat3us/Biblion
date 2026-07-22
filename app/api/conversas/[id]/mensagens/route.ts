import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created } from '@/lib/http'
import { parseJson, mensagemEnviarSchema } from '@/lib/validation'
import { ChatService } from '@/lib/services/chat'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const { corpo } = await parseJson(req, mensagemEnviarSchema)
    return created(await ChatService.sendMessage(user.id, id, corpo))
  },
  { rateLimit: RateLimits.standard },
)
