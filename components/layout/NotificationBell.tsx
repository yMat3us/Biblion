'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useLiveEvents } from '@/lib/use-live-events'
import { apiFetch } from '@/lib/api-fetch'

// Fallback quando o SSE está indisponível. Com o stream conectado, a contagem é
// atualizada por push; o polling só cobre a lacuna se o SSE cair.
const POLL_MS = 25000
// Aba oculta: espaça o polling (backoff). Ao voltar a ficar visível, atualiza já.
const POLL_HIDDEN_MS = 120000

export function NotificationBell() {
  const [naoLidas, setNaoLidas] = useState(0)

  const carregar = useCallback(async () => {
    try {
      const data = await apiFetch<{ naoLidas: number }>('/api/notificacoes?count=1', { timeoutMs: 8000 })
      setNaoLidas(data.naoLidas ?? 0)
    } catch {
      // silencioso: a próxima iteração do polling tenta de novo
    }
  }, [])

  // Tempo real: qualquer evento (amizade, mensagem) pode mudar a contagem de não
  // lidas, então recarregamos imediatamente ao recebê-lo.
  useLiveEvents(useCallback(() => void carregar(), [carregar]))

  useEffect(() => {
    let cancelado = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const agendar = () => {
      timer = setTimeout(executar, document.hidden ? POLL_HIDDEN_MS : POLL_MS)
    }

    async function executar() {
      if (cancelado) return
      await carregar()
      if (!cancelado) agendar()
    }

    const aoMudarVisibilidade = () => {
      if (cancelado || document.hidden) return
      if (timer) clearTimeout(timer)
      void executar()
    }

    // Primeira carga + loop agendados: o setState real roda no callback do timer,
    // não no corpo síncrono do efeito (evita cascata de renders).
    timer = setTimeout(executar, 0)
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [carregar])

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
