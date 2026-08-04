import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  authenticateCredentials: vi.fn(),
  createUserSession: vi.fn(),
  sessionCookie: vi.fn(() => ({ name: 'biblion_session', value: 'tok', path: '/' })),
  requireAuth: vi.fn(),
  rateLimit: vi.fn(),
  clientKey: vi.fn(() => 'ip-test'),
  failureCount: vi.fn(),
  registerFailure: vi.fn(),
  clearFailures: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authenticateCredentials: mocks.authenticateCredentials,
  createUserSession: mocks.createUserSession,
  sessionCookie: mocks.sessionCookie,
  requireAuth: mocks.requireAuth,
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  clientKey: mocks.clientKey,
  failureCount: mocks.failureCount,
  registerFailure: mocks.registerFailure,
  clearFailures: mocks.clearFailures,
  loginBackoffSeconds: () => 30,
  RateLimits: { auth: { limit: 8, windowMs: 60_000, scope: 'auth' } },
}))

import { POST as login } from '@/app/api/auth/login/route'

const BASE = 'https://app.example.com'
const creds = { username: 'usuario_valido', password: 'Senha-Forte-123' } // gitleaks:allow

function loginRequest(body: object) {
  return new NextRequest(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { origin: BASE, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('login — anti-brute-force (falhas por IP e conta, reset no sucesso)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', BASE)
    vi.stubEnv('ALLOWED_ORIGINS', '')
    vi.stubEnv('TRUST_PROXY', 'false')
    mocks.rateLimit.mockResolvedValue({ ok: true, remaining: 7, retryAfterSeconds: 0 })
    mocks.failureCount.mockResolvedValue(0)
    mocks.registerFailure.mockResolvedValue(1)
    mocks.clearFailures.mockResolvedValue(undefined)
    mocks.createUserSession.mockResolvedValue('session-token')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('bloqueia por IP ANTES de autenticar quando o IP excede o limite', async () => {
    mocks.failureCount.mockResolvedValueOnce(10)
    const res = await login(loginRequest(creds), undefined)
    expect(res.status).toBe(429)
    expect(mocks.authenticateCredentials).not.toHaveBeenCalled()
  })

  it('credencial válida sempre entra e zera os contadores (IP + conta)', async () => {
    mocks.authenticateCredentials.mockResolvedValueOnce({ id: 'u1', username: 'usuario_valido', role: 'MEMBER' })
    const res = await login(loginRequest(creds), undefined)
    expect(res.status).toBe(200)
    expect(mocks.clearFailures).toHaveBeenCalledTimes(2)
    expect(mocks.registerFailure).not.toHaveBeenCalled()
  })

  it('credencial inválida registra falha por IP e por conta e responde 401', async () => {
    mocks.authenticateCredentials.mockResolvedValueOnce(null)
    mocks.registerFailure.mockResolvedValue(3) // abaixo do teto por conta
    const res = await login(loginRequest(creds), undefined)
    expect(res.status).toBe(401)
    expect(mocks.registerFailure).toHaveBeenCalledTimes(2)
    expect(mocks.clearFailures).not.toHaveBeenCalled()
  })

  it('muitas falhas na conta transformam a FALHA em 429 (backoff), sem bloquear login válido', async () => {
    mocks.authenticateCredentials.mockResolvedValueOnce(null)
    mocks.registerFailure.mockResolvedValue(10) // conta atingiu o teto
    const res = await login(loginRequest(creds), undefined)
    expect(res.status).toBe(429)
  })
})
