import type { NextRequest } from 'next/server'
import { ok, errorResponse } from '@/lib/http'
import { assertInternalSecret } from '@/lib/internal-auth'
import { Events } from '@/lib/events/outbox'
import { logger } from '@/lib/logger'

// Processador de retentativa do outbox. A entrega normal ocorre via after() logo
// após cada ação; este job é a rede de segurança (durabilidade) que reentrega
// eventos que falharam ou cujo after() não rodou. Autenticado por CRON_SECRET.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(req: NextRequest): Promise<Response> {
  try {
    assertInternalSecret(req)
    // Processa em lotes até esvaziar a fila vencida (teto de lotes evita loop longo).
    let processed = 0
    let failed = 0
    let retried = 0
    for (let batch = 0; batch < 20; batch += 1) {
      const result = await Events.processPending(50)
      processed += result.processed
      failed += result.failed
      retried += result.retried
      if (result.processed + result.failed + result.retried === 0) break
    }
    const report = { processed, failed, retried }
    logger.info('cron_outbox_processed', report)
    const response = ok({ ok: true, report })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return errorResponse(error)
  }
}

export const GET = handle
export const POST = handle
