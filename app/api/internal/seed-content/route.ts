import type { NextRequest } from 'next/server'
import { ok, errorResponse, ApiErrors } from '@/lib/http'
import { assertInternalSecret } from '@/lib/internal-auth'
import { ContentSeed } from '@/lib/services/content-seed'

// Semeia o conteúdo global (Bíblia/hinário) no Mongo a partir dos JSON. Só POST
// (muta dados), guardada por CRON_SECRET. Um alvo por chamada, via querystring
// `?target=ACF` (versão) ou `?target=hinos`. Idempotente. Depois de semear todos
// e setar CONTENT_SOURCE=mongo, o fs e o outputFileTracingIncludes podem sair.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Semear uma versão inteira envia milhares de capítulos; folga no tempo.
export const maxDuration = 300

export async function POST(req: NextRequest): Promise<Response> {
  try {
    assertInternalSecret(req)
    const target = req.nextUrl.searchParams.get('target')?.trim()
    if (!target) {
      throw ApiErrors.badRequest(`Informe ?target= (um de: ${ContentSeed.targets().join(', ')})`)
    }
    const report = await ContentSeed.seed(target)
    const response = ok({ ok: true, report })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return errorResponse(error)
  }
}
