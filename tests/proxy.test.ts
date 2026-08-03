import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { SESSION_COOKIE } from '@/lib/auth-constants'

const ORIGIN = 'https://app.example.com'

function pageRequest(pathname: string, { authenticated = false } = {}) {
  const headers = new Headers()
  if (authenticated) headers.set('cookie', `${SESSION_COOKIE}=opaque-token`)
  return new NextRequest(`${ORIGIN}${pathname}`, { headers })
}

/** Extrai a diretiva pedida da string de CSP. */
function directive(csp: string, name: string): string {
  return csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `)) ?? ''
}

describe('proxy — CSP com nonce', () => {
  it('remove unsafe-inline de script-src e usa nonce + strict-dynamic', () => {
    const response = proxy(pageRequest('/dashboard', { authenticated: true }))
    const csp = response.headers.get('Content-Security-Policy') ?? ''
    const scriptSrc = directive(csp, 'script-src')

    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9]+'/)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('mantém unsafe-inline em style-src (atributos style="" do tema/avatar)', () => {
    const response = proxy(pageRequest('/dashboard', { authenticated: true }))
    const csp = response.headers.get('Content-Security-Policy') ?? ''
    expect(directive(csp, 'style-src')).toContain("'unsafe-inline'")
  })

  it('gera um nonce diferente a cada requisição', () => {
    const first = proxy(pageRequest('/dashboard', { authenticated: true }))
    const second = proxy(pageRequest('/dashboard', { authenticated: true }))
    const nonceOf = (response: Response) =>
      /'nonce-([A-Za-z0-9]+)'/.exec(response.headers.get('Content-Security-Policy') ?? '')?.[1]

    const a = nonceOf(first)
    const b = nonceOf(second)
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
  })

  it('aplica a CSP na página pública de login sem redirecionar', () => {
    const response = proxy(pageRequest('/login'))
    expect(response.headers.get('Content-Security-Policy')).toContain("script-src")
    // 200/next (não é um redirect 3xx)
    expect(response.status).toBeLessThan(300)
  })

  it('redireciona página protegida sem cookie para /login', () => {
    const response = proxy(pageRequest('/sermoes'))
    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('/login')
    expect(location).toContain('from=%2Fsermoes')
  })

  it('não injeta CSP com nonce em rotas de API', () => {
    const response = proxy(pageRequest('/api/sermoes', { authenticated: true }))
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('não injeta CSP com nonce no fallback offline estático', () => {
    const response = proxy(pageRequest('/offline.html'))
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('inclui report-uri para monitorar violações de CSP', () => {
    const response = proxy(pageRequest('/dashboard', { authenticated: true }))
    expect(response.headers.get('Content-Security-Policy')).toContain('report-uri /api/csp-report')
  })
})

describe('proxy — rollout report-only', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('com CSP_REPORT_ONLY=true usa o header Report-Only e não enforça', () => {
    vi.stubEnv('CSP_REPORT_ONLY', 'true')
    const response = proxy(pageRequest('/dashboard', { authenticated: true }))
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain('script-src')
    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('por padrão enforça (header canônico presente, sem Report-Only)', () => {
    const response = proxy(pageRequest('/dashboard', { authenticated: true }))
    expect(response.headers.get('Content-Security-Policy')).toContain('script-src')
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
  })
})
