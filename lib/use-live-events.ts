'use client'

import { useEffect, useRef } from 'react'

export interface LiveEvent {
  type: string
  conversationId?: string
}

/**
 * Assina o stream SSE `/api/stream` e chama `onEvent` a cada evento em tempo real.
 * O `EventSource` reconecta sozinho em quedas. Se o navegador não suportar SSE
 * (ou a conexão falhar), é um no-op — os componentes mantêm o polling como
 * fallback. `onEvent`/`onStatus` são lidos via ref, então podem mudar de
 * identidade sem reabrir a conexão.
 */
export function useLiveEvents(
  onEvent: (event: LiveEvent) => void,
  onStatus?: (connected: boolean) => void,
): void {
  const onEventRef = useRef(onEvent)
  const onStatusRef = useRef(onStatus)

  // Mantém as refs atualizadas fora do render (a regra react-hooks/refs proíbe
  // escrever em ref.current durante o render).
  useEffect(() => {
    onEventRef.current = onEvent
    onStatusRef.current = onStatus
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    let source: EventSource
    try {
      source = new EventSource('/api/stream')
    } catch {
      return
    }

    const handleReady = () => onStatusRef.current?.(true)
    const handleEvent = (event: MessageEvent) => {
      try {
        onEventRef.current(JSON.parse(event.data) as LiveEvent)
      } catch {
        // Frame malformado: ignora.
      }
    }
    // O erro do EventSource dispara sua reconexão automática; sinalizamos "offline"
    // para que o componente volte à cadência de polling enquanto isso.
    const handleError = () => onStatusRef.current?.(false)

    source.addEventListener('ready', handleReady)
    source.addEventListener('event', handleEvent as EventListener)
    source.addEventListener('error', handleError)

    return () => {
      source.removeEventListener('ready', handleReady)
      source.removeEventListener('event', handleEvent as EventListener)
      source.removeEventListener('error', handleError)
      source.close()
    }
  }, [])
}
