'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

export type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

interface FeedbackContextValue {
  toast: (type: ToastType, message: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

const toastMeta = {
  success: { icon: CheckCircle2, iconClass: 'bg-success/10 text-success', label: 'Sucesso' },
  error: { icon: AlertTriangle, iconClass: 'bg-destructive/10 text-destructive', label: 'Erro' },
  info: { icon: Info, iconClass: 'bg-primary-soft text-primary', label: 'Informação' },
} satisfies Record<ToastType, { icon: typeof Info; iconClass: string; label: string }>

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: '' })
  const idRef = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current
    setToasts((current) => [...current, { id, type, message }])
    window.setTimeout(() => dismissToast(id), 4500)
  }, [dismissToast])

  const confirm = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, open: true, resolve })
    })
  ), [])

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current.resolve?.(value)
      return { ...current, open: false, resolve: undefined }
    })
  }, [])

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="toast-region pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[140] ml-auto flex max-w-sm flex-col gap-2.5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const meta = toastMeta[item.type]
            const Icon = meta.icon
            return (
              <motion.div
                key={item.id}
                role={item.type === 'error' ? 'alert' : 'status'}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98 }}
                className="glass pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 shadow-overlay"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  aria-label={`Fechar aviso: ${item.message}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-foreground"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <Modal
        isOpen={confirmState.open}
        onClose={() => closeConfirm(false)}
        title={confirmState.title || 'Confirmar ação'}
        description={confirmState.danger ? 'Esta ação exige sua confirmação.' : undefined}
        size="sm"
      >
        <div className="flex gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${confirmState.danger ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary'}`}>
            {confirmState.danger ? <ShieldAlert size={20} /> : <Info size={20} />}
          </span>
          <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{confirmState.message}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => closeConfirm(false)}>
            {confirmState.cancelText || 'Cancelar'}
          </Button>
          <Button variant={confirmState.danger ? 'danger' : 'primary'} onClick={() => closeConfirm(true)}>
            {confirmState.confirmText || 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </FeedbackContext.Provider>
  )
}

function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback deve ser usado dentro de <FeedbackProvider>')
  return context
}

export function useToast() {
  const { toast } = useFeedback()
  return {
    success: (message: string) => toast('success', message),
    error: (message: string) => toast('error', message),
    info: (message: string) => toast('info', message),
  }
}

export function useConfirm() {
  return useFeedback().confirm
}
