import type { MetadataRoute } from 'next'

/**
 * Web App Manifest — makes Biblion installable (PWA) with a standalone,
 * app-like experience. Colors match the calm dark canvas so the splash and
 * OS chrome blend with the UI. Auto-linked by Next at `/manifest.webmanifest`.
 *
 * Includes PNG icons in standard sizes (192x192 and 512x512) required for
 * full PWA installability on Android/Chrome and iOS Safari.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Biblion — Plataforma de Estudo Bíblico',
    short_name: 'Biblion',
    description:
      'Estudo bíblico, sermões, esboços de pregação e preparação de aulas — em um só lugar.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#08090c',
    theme_color: '#08090c',
    lang: 'pt-BR',
    categories: ['education', 'books', 'productivity'],
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
