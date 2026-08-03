import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface CspReportEntry {
  'csp-report'?: Record<string, unknown>
  body?: Record<string, unknown>
  [key: string]: unknown
}

/** Extrai um resumo enxuto e limitado de um relatório CSP (report-uri ou report-to). */
function summarize(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null
  const entry = (Array.isArray(payload) ? payload[0] : payload) as CspReportEntry | undefined
  if (!entry || typeof entry !== 'object') return null
  const report = (entry['csp-report'] ?? entry.body ?? entry) as Record<string, unknown>
  const pick = (a: string, b: string) => report[a] ?? report[b]
  return {
    directive: pick('effective-directive', 'effectiveDirective') ?? pick('violated-directive', 'violatedDirective'),
    blocked: pick('blocked-uri', 'blockedURL'),
    document: pick('document-uri', 'documentURL'),
    sourceFile: pick('source-file', 'sourceFile'),
    line: pick('line-number', 'lineNumber'),
  }
}

// Coletor de violações de CSP. Público (o navegador envia sem sessão), com rate
// limit por IP e log enxuto/redigido. Retorna 204 sempre (best-effort).
export const POST = route(
  async (req: NextRequest) => {
    let payload: unknown = null
    try {
      payload = await req.json()
    } catch {
      // Corpo ausente/ inválido: ignora (relatório best-effort).
    }
    const summary = summarize(payload)
    if (summary) logger.warn('csp_violation', summary)
    return new Response(null, { status: 204 })
  },
  { auth: false, rateLimit: { limit: 60, windowMs: 60_000, scope: 'csp-report' } },
)
