'use client'

import { useEffect } from 'react'

// Registro de push nativo (somente app Capacitor). Pede permissão, cria o canal
// Android usado pelas notificações de progresso e envia o token FCM ao servidor.
// No navegador/PWA é um no-op (o acompanhamento em segundo plano usa o dock +
// notificações Web já existentes).

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

export function PushRegistration() {
  useEffect(() => {
    const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
    const isNative = capacitor?.isNativePlatform?.() ?? false
    if (!isNative) return

    let removeListeners: (() => void) | undefined
    let cancelled = false

    const platform = (capacitor?.getPlatform?.() ?? 'android') as 'android' | 'ios' | 'web'

    void (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Permissão (Android 13+ exige POST_NOTIFICATIONS em runtime).
        const current = await PushNotifications.checkPermissions()
        let receive = current.receive
        if (receive === 'prompt' || receive === 'prompt-with-rationale') {
          receive = (await PushNotifications.requestPermissions()).receive
        }
        if (receive !== 'granted' || cancelled) return

        // Canal Android usado pelo servidor (id deve bater com lib/push.ts).
        // Importância baixa: atualizações frequentes sem som/heads-up.
        try {
          await PushNotifications.createChannel({
            id: 'analysis_progress',
            name: 'Progresso das análises',
            description: 'Acompanhamento da geração de análises bíblicas',
            importance: 2,
            visibility: 1,
          })
        } catch {
          // createChannel só existe no Android; ignora em outras plataformas.
        }

        const registration = await PushNotifications.addListener('registration', (token) => {
          void fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, platform }),
          }).catch(() => undefined)
        })

        const registrationError = await PushNotifications.addListener('registrationError', (err) => {
          console.warn('[Push] registrationError', err)
        })

        if (cancelled) {
          void registration.remove()
          void registrationError.remove()
          return
        }

        await PushNotifications.register()
        removeListeners = () => {
          void registration.remove()
          void registrationError.remove()
        }
      } catch (error) {
        console.warn('[Push] setup failed', error)
      }
    })()

    return () => {
      cancelled = true
      removeListeners?.()
    }
  }, [])

  return null
}
