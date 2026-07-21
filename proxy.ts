import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-constants'

const PUBLIC_PAGES = new Set(['/login', '/offline.html'])

/**
 * Next.js 16 Proxy performs only an optimistic cookie-presence check for pages.
 * Database-backed session validation and authorization remain in Route
 * Handlers, services and the protected dashboard layout.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIs return their own JSON 401/403 through the route() wrapper.
  if (pathname.startsWith('/api/')) return NextResponse.next()
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next()

  if (!request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
