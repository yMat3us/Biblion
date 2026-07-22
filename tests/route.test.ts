import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@prisma/client'
import { NextRequest } from 'next/server'
import type { AuthUser } from '@/lib/auth'

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  rateLimit: vi.fn(),
  clientKey: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientKey: mocks.clientKey,
}))

import { route } from '@/lib/route'

const user: AuthUser = {
  id: 'user-1',
  username: 'owner',
  role: UserRole.OWNER,
  displayName: 'Owner',
  bio: null,
  avatarUrl: null,
  accentColor: 'violet',
  locale: 'pt-BR',
  publicId: 'abcdefgh2345',
  isSearchable: true,
  profileVisibility: 'PUBLIC',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function request(method = 'POST', headers: Record<string, string> = {}) {
  return new NextRequest('https://app.example.com/api/test', {
    method,
    headers: {
      origin: 'https://app.example.com',
      'sec-fetch-site': 'same-origin',
      ...headers,
    },
  })
}

describe('route security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.example.com')
    vi.stubEnv('ALLOWED_ORIGINS', '')
    vi.stubEnv('TRUST_PROXY', 'false')
    mocks.requireAuth.mockResolvedValue(user)
    mocks.rateLimit.mockResolvedValue({ ok: true, remaining: 4, retryAfterSeconds: 0 })
    mocks.clientKey.mockReturnValue('client-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('authenticates protected handlers and prevents response caching', async () => {
    const observed = vi.fn()
    const handler = route(async (_req, _ctx, principal) => {
      observed(principal)
      return Response.json({ userId: principal.id })
    })

    const response = await handler(request('GET'), undefined)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ userId: user.id })
    expect(mocks.requireAuth).toHaveBeenCalledOnce()
    expect(observed).toHaveBeenCalledWith(user)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Vary')).toContain('Cookie')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('blocks cross-site mutations before authentication or handler execution', async () => {
    const observed = vi.fn()
    const handler = route(async () => {
      observed()
      return Response.json({ ok: true })
    })

    const response = await handler(request('POST', {
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
    }), undefined)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'FORBIDDEN' } })
    expect(mocks.requireAuth).not.toHaveBeenCalled()
    expect(observed).not.toHaveBeenCalled()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('allows explicitly public routes without creating an implicit principal', async () => {
    const handler = route(
      async (_req, _ctx, principal) => Response.json({ principal }),
      { auth: false },
    )

    const response = await handler(request(), undefined)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ principal: null })
    expect(mocks.requireAuth).not.toHaveBeenCalled()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('enforces independent IP and authenticated-account limits', async () => {
    const handler = route(
      async () => Response.json({ ok: true }),
      { rateLimit: { limit: 5, windowMs: 60_000 } },
    )

    const response = await handler(request(), undefined)

    expect(response.status).toBe(200)
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, 'ip:POST:/api/test:client-key', 5, 60_000)
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, `user:POST:/api/test:${user.id}`, 5, 60_000)
  })

  it('uses a stable scope for aggregate limits such as AI quotas', async () => {
    const handler = route(
      async () => Response.json({ ok: true }),
      { rateLimit: { limit: 20, windowMs: 60_000, scope: 'ai' } },
    )

    const response = await handler(request(), undefined)

    expect(response.status).toBe(200)
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, 'ip:POST:ai:client-key', 20, 60_000)
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, `user:POST:ai:${user.id}`, 20, 60_000)
  })

  it('returns a typed 429 response with Retry-After when throttled', async () => {
    mocks.rateLimit.mockResolvedValueOnce({ ok: false, remaining: 0, retryAfterSeconds: 17 })
    const handler = route(
      async () => Response.json({ ok: true }),
      { rateLimit: { limit: 5, windowMs: 60_000 } },
    )

    const response = await handler(request(), undefined)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('17')
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'TOO_MANY_REQUESTS' } })
    expect(mocks.requireAuth).not.toHaveBeenCalled()
  })
})
