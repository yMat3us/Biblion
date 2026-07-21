import type { NextRequest } from 'next/server'
import { ApiErrors, errorResponse } from '@/lib/http'
import { requireAuth, type AuthUser } from '@/lib/auth'
import { rateLimit, clientKey } from '@/lib/rate-limit'

interface RouteOptions {
  /** Require a valid database-backed session. Defaults to `true`. */
  auth?: boolean
  /** Optional rate limit, enforced by IP and authenticated account. */
  rateLimit?: { limit: number; windowMs: number; scope?: string }
}

type ProtectedHandler<Ctx> = (req: NextRequest, ctx: Ctx, user: AuthUser) => Promise<Response> | Response
type PublicHandler<Ctx> = (req: NextRequest, ctx: Ctx, user: null) => Promise<Response> | Response
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function trustedOrigins(req: NextRequest) {
  const allowed = new Set([req.nextUrl.origin])
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.ALLOWED_ORIGINS ?? '').split(',')]

  if (process.env.TRUST_PROXY === 'true') {
    const host = req.headers.get('x-forwarded-host')
    const protocol = req.headers.get('x-forwarded-proto')
    if (host && (protocol === 'https' || protocol === 'http')) candidates.push(`${protocol}://${host}`)
  }

  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (!value) continue
    try {
      allowed.add(new URL(value).origin)
    } catch {
      // Invalid deployment entries are ignored instead of widening access.
    }
  }
  return allowed
}

function assertTrustedOrigin(req: NextRequest): void {
  if (SAFE_METHODS.has(req.method)) return
  if (req.headers.get('sec-fetch-site') === 'cross-site') {
    throw ApiErrors.forbidden('Origem da requisição não permitida')
  }
  const origin = req.headers.get('origin')
  if (origin && !trustedOrigins(req).has(origin)) {
    throw ApiErrors.forbidden('Origem da requisição não permitida')
  }
}

async function enforceLimit(key: string, limit: number, windowMs: number) {
  const result = await rateLimit(key, limit, windowMs)
  if (!result.ok) throw ApiErrors.tooManyRequests(undefined, result.retryAfterSeconds)
}

function hardenResponse(response: Response, authenticated: boolean): Response {
  response.headers.set('Cache-Control', authenticated ? 'private, no-store' : 'no-store')
  if (authenticated) response.headers.append('Vary', 'Cookie')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export function route<Ctx = unknown>(
  handler: ProtectedHandler<Ctx>,
  options?: RouteOptions & { auth?: true },
): (req: NextRequest, ctx: Ctx) => Promise<Response>
export function route<Ctx = unknown>(
  handler: PublicHandler<Ctx>,
  options: RouteOptions & { auth: false },
): (req: NextRequest, ctx: Ctx) => Promise<Response>

/** Definitive API boundary: throttling, CSRF origin checks, auth and safe errors. */
export function route<Ctx = unknown>(
  handler: ProtectedHandler<Ctx> | PublicHandler<Ctx>,
  options: RouteOptions = {},
) {
  const { auth = true, rateLimit: limitOptions } = options

  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      const pathname = req.nextUrl.pathname
      const limitScope = limitOptions?.scope ?? pathname
      if (limitOptions) {
        await enforceLimit(
          `ip:${req.method}:${limitScope}:${clientKey(req)}`,
          limitOptions.limit,
          limitOptions.windowMs,
        )
      }

      assertTrustedOrigin(req)
      const user = auth ? await requireAuth(req) : null

      if (user && limitOptions) {
        await enforceLimit(
          `user:${req.method}:${limitScope}:${user.id}`,
          limitOptions.limit,
          limitOptions.windowMs,
        )
      }

      const response = await (
        handler as (request: NextRequest, context: Ctx, principal: AuthUser | null) => Promise<Response> | Response
      )(req, ctx, user)

      return hardenResponse(response, auth)
    } catch (error) {
      return hardenResponse(errorResponse(error), auth)
    }
  }
}
