import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ApiErrors, ok } from '@/lib/http'
import { parseJson, configuracaoUpsertSchema } from '@/lib/validation'
import { ConfiguracaoService } from '@/lib/services/configuracao'
import { RateLimits } from '@/lib/rate-limit'

const ALLOWED_KEYS = new Set(['bible_version'])

export const GET = route(
  async (req: NextRequest, _ctx, user) => {
    const chave = req.nextUrl.searchParams.get('chave')
    if (!chave || !ALLOWED_KEYS.has(chave)) throw ApiErrors.badRequest('Chave de configuração inválida')
    const config = await ConfiguracaoService.get(user.id, chave)
    return ok(config ?? { valor: null })
  },
  { rateLimit: RateLimits.standard },
)

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const { chave, valor } = await parseJson(req, configuracaoUpsertSchema)
    return ok(await ConfiguracaoService.upsert(user.id, chave, valor))
  },
  { rateLimit: RateLimits.standard },
)
