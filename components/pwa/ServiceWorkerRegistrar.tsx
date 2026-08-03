'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister()
      })
      caches.keys().then((keys) => {
        for (const key of keys) if (key.startsWith('biblion-')) caches.delete(key)
      })
      return
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
      console.warn('[SW] Registration failed:', error)
    })
  }, [])

  return null
}
