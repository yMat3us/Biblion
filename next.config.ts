import type { NextConfig } from 'next'

const isProduction = process.env.NODE_ENV === 'production'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const isHttps = siteUrl.startsWith('https://')
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? 'localhost')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
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
  ...(isProduction && isHttps ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  ...(isProduction && isHttps
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const protectedPrefixes = [
  'dashboard', 'biblia', 'hinos', 'planos', 'busca', 'sermoes', 'ebd', 'esbocos', 'anotacoes', 'teologia', 'tutor', 'amigos', 'u', 'conversas', 'notificacoes', 'perfil', 'contas',
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ['@prisma/client', 'prisma', 'pdf-parse'],
  // Estes JSON são lidos em runtime via fs/process.cwd(), então o tracer estático
  // não os detecta. Sem isso, o build `standalone` não os copia e as leituras
  // falham em produção. Chaves são globs de rota (picomatch); use `*` porque
  // colchetes de rotas dinâmicas seriam interpretados como classes de caractere.
  outputFileTracingIncludes: {
    '/hinos': ['./Harpa.json'],
    '/hinos/*': ['./Harpa.json'],
    '/api/hinos': ['./Harpa.json'],
    '/api/hinos/*': ['./Harpa.json'],
    '/api/hinos/*/favoritar': ['./Harpa.json'],
    '/api/bible/*/*/*': ['./Versions/**'],
  },
  allowedDevOrigins,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...protectedPrefixes.map((prefix) => ({
        source: `/${prefix}/:path*`,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'Vary', value: 'Cookie' },
        ],
      })),
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
