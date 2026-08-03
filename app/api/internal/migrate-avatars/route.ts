import type { NextRequest } from 'next/server'
import { ok, errorResponse } from '@/lib/http'
import { assertInternalSecret } from '@/lib/internal-auth'
import { migrateBase64Avatars } from '@/lib/services/avatar-migration'

// Migração one-shot dos avatares base64 legados para o object storage. Só POST
// (muta dados) e guardada por CRON_SECRET. Idempotente e em lote: chame em loop
// até `report.remaining` ser 0. Requer STORAGE_* configurado.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  try {
    assertInternalSecret(req)
    const report = await migrateBase64Avatars(50)
    const response = ok({ ok: true, report })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return errorResponse(error)
  }
}
