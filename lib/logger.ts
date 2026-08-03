// Logger estruturado com redação de segredos/PII. Emite uma linha JSON por
// evento (parseável por agregadores) e NUNCA registra tokens, senhas, hashes,
// cookies ou cabeçalhos de autorização — mesmo quando embutidos em objetos de
// erro. É a saída de log padrão do servidor; o console do navegador (client)
// permanece com console.* pois não toca dados do servidor.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogMeta = Record<string, unknown>

// Chaves cujo valor é redigido por completo. "authorization" (não "auth", para
// não pegar authorId/authVersion); "hash"/"token" pegam tokenHash, passwordHash,
// accessToken etc.
const SENSITIVE_KEY = /password|token|secret|authorization|cookie|hash|api[-_]?key|credential|bearer|\botp\b/i

const REDACTED = '[REDACTED]'
const MAX_STRING = 2_000
const MAX_DEPTH = 4
const MAX_ARRAY = 50

/** Mascara segredos incorporados em texto livre (ex.: mensagens de erro). */
function maskSecretsInString(input: string): string {
  const masked = input
    .replace(/(bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi, `$1${REDACTED}`)
    .replace(/((?:password|token|secret|cookie|authorization|apikey|api[-_]?key)\s*[=:]\s*)[^\s,;&]+/gi, `$1${REDACTED}`)
  return masked.length > MAX_STRING ? `${masked.slice(0, MAX_STRING)}…[truncated]` : masked
}

function redactError(err: Error): LogMeta {
  const out: LogMeta = { name: err.name, message: maskSecretsInString(err.message) }
  const code = (err as { code?: unknown }).code
  if (code !== undefined && typeof code !== 'object') out.code = code
  // Stack só fora de produção (útil no dev, evita ruído/vazamento em prod logs).
  if (process.env.NODE_ENV !== 'production' && err.stack) out.stack = maskSecretsInString(err.stack)
  return out
}

function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return maskSecretsInString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) return redactError(value)
  if (depth >= MAX_DEPTH) return '[…]'
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(val, depth + 1)
    }
    return out
  }
  return REDACTED // funções/símbolos: não serializa
}

function write(level: LogLevel, event: string, meta?: LogMeta): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return
  const entry = { level, time: new Date().toISOString(), event, ...(meta ? (redact(meta) as LogMeta) : {}) }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (event: string, meta?: LogMeta) => write('debug', event, meta),
  info: (event: string, meta?: LogMeta) => write('info', event, meta),
  warn: (event: string, meta?: LogMeta) => write('warn', event, meta),
  error: (event: string, meta?: LogMeta) => write('error', event, meta),
}

// Exportados para teste da redação.
export const __redactForTest = redact
