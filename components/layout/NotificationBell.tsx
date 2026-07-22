'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

const POLL_MS = 25000

export function NotificationBell() {
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const response = await fetch('/api/notificacoes?count=1')
        if (!response.ok) return
        const data = (await response.json()) as { naoLidas: number }
        if (ativo) setNaoLidas(data.naoLidas ?? 0)
      } catch {
        // silencioso
      }
    }
    void carregar()
    const intervalo = setInterval(carregar, POLL_MS)
    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [])

  return (
    <Link
      href="/notificacoes"
      aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-foreground"
    >
      <Bell size={18} />
      {naoLidas > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {naoLidas > 9 ? '9+' : naoLidas}
        </span>
      )}
    </Link>
  )
}
