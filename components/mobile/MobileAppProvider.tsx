'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { App as CapacitorApp } from '@capacitor/app'
import { useToast } from '@/components/ui/Feedback'

export function MobileAppProvider() {
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const [backPressedTime, setBackPressedTime] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === 'undefined' || !(window as any).Capacitor?.isNative) {
      return
    }

    const listener = CapacitorApp.addListener('backButton', () => {
      const isRootPage = ['/', '/dashboard', '/biblia', '/sermoes', '/planos', '/hinos', '/ebd', '/tutor', '/amigos'].includes(pathname)
      
      if (isRootPage) {
        const now = Date.now()
        if (now - backPressedTime < 2000) {
          CapacitorApp.exitApp()
        } else {
          setBackPressedTime(now)
          toast.success('Pressione VOLTAR novamente para sair') // Using success/info toast style
        }
      } else {
        // Not a root page, just go back
        router.back()
      }
    })

    return () => {
      listener.then(l => l.remove())
    }
  }, [router, pathname, backPressedTime, toast])

  return null
}
