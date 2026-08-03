import type { NextRequest } from 'next/server'
import { ok, errorResponse } from '@/lib/http'
import { assertInternalSecret } from '@/lib/internal-auth'
import { MaintenanceService } from '@/lib/services/maintenance'
import { logger } from '@/lib/logger'

// Job interno de manutenção. Não usa route() (que exige sessão de usuário + CSRF):
// é chamado por um agendador (Vercel Cron ou cron self-hosted) autenticado por
// CRON_SECRET. nodejs + force-dynamic garantem execução no servidor a cada disparo.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(req: NextRequest): Promise<Response> {
  try {
    assertInternalSecret(req)
    const report = await MaintenanceService.runAll()
    logger.info('cron_maintenance_completed', { ...report })
    const response = ok({ ok: true, report })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    // Não vaza internals: erros conhecidos viram envelope tipado; 5xx são genéricos.
    return errorResponse(error)
  }
}

// Vercel Cron dispara via GET; agendadores genéricos podem usar POST. Ambos exigem
// o segredo no header Authorization (Bearer) ou x-cron-secret.
export const GET = handle
export const POST = handle
