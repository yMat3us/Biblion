/// <reference lib="webworker" />

const CACHE_NAME = 'biblion-public-v4'
const PUBLIC_ASSETS = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
]
const DEFAULT_NOTIFICATION_PATH = '/dashboard'

function safeNotificationPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return DEFAULT_NOTIFICATION_PATH

  try {
    const destination = new URL(value, self.location.origin)
    if (destination.origin !== self.location.origin) return DEFAULT_NOTIFICATION_PATH
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return DEFAULT_NOTIFICATION_PATH
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PUBLIC_ASSETS.map((asset) => cache.add(asset))),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('biblion-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_PRIVATE_CACHES') return
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('biblion-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Authenticated HTML and React Server Component payloads are always network-only.
  const isRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')
  if (isRsc) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(async () => {
        return (await caches.match('/offline.html')) || new Response('Offline', { status: 503 })
      }),
    )
    return
  }

  const isPublicAsset =
    url.pathname.startsWith('/_next/static/') ||
    PUBLIC_ASSETS.includes(url.pathname)
  if (!isPublicAsset) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') cache.put(request, response.clone())
          return response
        })
        .catch(() => null)
      return cached || (await network) || new Response('Offline', { status: 503 })
    }),
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    return
  }
  event.waitUntil(self.registration.showNotification(String(data.title || 'Biblion'), {
    body: String(data.body || ''),
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: safeNotificationPath(data.url) },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeNotificationPath(event.notification.data?.url)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
