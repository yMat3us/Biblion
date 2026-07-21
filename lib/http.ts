import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standardized API error. Thrown anywhere inside a route handler wrapped by
 * `route()` and translated into a consistent JSON envelope.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const ApiErrors = {
  badRequest: (message = 'Requisição inválida', details?: unknown) =>
    new ApiError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Não autenticado') =>
    new ApiError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Acesso negado') =>
    new ApiError(403, 'FORBIDDEN', message),
  notFound: (message = 'Recurso não encontrado') =>
    new ApiError(404, 'NOT_FOUND', message),
  payloadTooLarge: (message = 'Arquivo/entrada excede o tamanho permitido') =>
    new ApiError(413, 'PAYLOAD_TOO_LARGE', message),
  unprocessable: (message = 'Dados inválidos', details?: unknown) =>
    new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details),
  tooManyRequests: (message = 'Muitas requisições. Tente novamente em instantes.', retryAfter?: number) =>
    new ApiError(429, 'TOO_MANY_REQUESTS', message, { retryAfter }),
  serviceUnavailable: (message = 'Serviço temporariamente indisponível') =>
    new ApiError(503, 'SERVICE_UNAVAILABLE', message),
  internal: (message = 'Erro interno') =>
    new ApiError(500, 'INTERNAL', message),
}

type JsonInit = number | ResponseInit

function toInit(init?: JsonInit): ResponseInit | undefined {
  return typeof init === 'number' ? { status: init } : init
}

/**
 * Success response. The resource is returned directly (not wrapped), which keeps
 * client consumers simple and backward-compatible. Errors, in contrast, always
 * use the standardized `{ error: { code, message, details } }` envelope.
 */
export function ok<T>(data: T, init?: JsonInit) {
  return NextResponse.json(data as unknown as Record<string, unknown>, toInit(init))
}

/** 201 Created success response (resource returned directly). */
export function created<T>(data: T) {
  return NextResponse.json(data as unknown as Record<string, unknown>, { status: 201 })
}

/** Builds the error envelope for a given error. Never leaks internals on 5xx. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      {
        status: err.status,
        headers:
          err.status === 429 && err.details && typeof err.details === 'object' && 'retryAfter' in err.details
            ? { 'Retry-After': String((err.details as { retryAfter?: number }).retryAfter ?? 60) }
            : undefined,
      },
    )
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'UNPROCESSABLE_ENTITY',
          message: 'Dados inválidos',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 422 },
    )
  }

  // Unknown/unexpected error: log server-side, return generic message to client.
  console.error('[API_UNHANDLED_ERROR]', err)
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Erro interno do servidor' } },
    { status: 500 },
  )
}
