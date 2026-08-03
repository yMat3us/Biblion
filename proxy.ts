import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-constants'

const PUBLIC_PAGES = new Set(['/login', '/offline.html'])

const isProduction = process.env.NODE_ENV === 'production'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const isHttps = siteUrl.startsWith('https://')

/**
 * CSP por requisição com nonce. `script-src` NÃO usa mais 'unsafe-inline':
 * apenas o nonce (aplicado automaticamente pelo Next aos seus scripts) e
 * 'strict-dynamic'. Isso fecha o principal vetor de XSS por injeção de <script>.
 *
 * `style-src` mantém 'unsafe-inline' de propósito: o app usa atributos style=""
 * (tema por variável CSS, imagem de avatar) em toda parte, e um nonce NÃO cobre
 * atributos style — só elementos <style>/<link>. Removê-lo quebraria o tema.
 */
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https:${isProduction ? '' : ' ws: wss:'}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Violações são reportadas para monitorarmos a política em produção e antes
    // de qualquer aperto futuro (report-uri é amplamente suportado).
    'report-uri /api/csp-report',
    ...(isProduction && isHttps ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

/**
 * Next.js 16 Proxy: checagem otimista de cookie para páginas + injeção da CSP
 * com nonce. A validação de sessão no banco e a autorização continuam nos Route
 * Handlers, serviços e no layout protegido.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIs retornam o próprio JSON 401/403 pelo wrapper route(); respostas sem HTML
  // não precisam de CSP com nonce. offline.html é estático (servido pelo SW, com
  // handler inline) e ficaria quebrado sob script-src estrito — deixamos passar.
  if (pathname.startsWith('/api/') || pathname === '/offline.html') {
    return NextResponse.next()
  }

  // Redireciona páginas protegidas sem cookie. O redirect não tem corpo HTML,
  // então não precisa de CSP.
  if (!PUBLIC_PAGES.has(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Nonce único por requisição. O Next o extrai do header Content-Security-Policy
  // da requisição e o aplica a todos os seus <script>.
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const csp = contentSecurityPolicy(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  // Sempre no header canônico para o Next extrair o nonce e aplicá-lo aos scripts,
  // mesmo em modo report-only (assim, ao migrar para enforce, tudo já funciona).
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  // Toggle de rollout: CSP_REPORT_ONLY=true monitora sem bloquear (report-only);
  // padrão é enforce. Reporta violações via report-uri em ambos os modos.
  const enforceHeader = process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
  response.headers.set(enforceHeader, csp)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
