'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { LayoutDashboard, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, buttonStyles } from '@/components/ui/Button'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    console.error(error)
    titleRef.current?.focus()
  }, [error])

  return (
    <div className="system-state-shell">
      <section
        role="alert"
        aria-labelledby="error-title"
        className="system-state system-state--error"
      >
        <span aria-hidden="true" className="system-state__rule" />
        <div className="relative">
          <div className="system-state__seal">
            <TriangleAlert size={28} aria-hidden="true" />
          </div>
          <p className="eyebrow mb-3 text-destructive">Interrupção inesperada</p>
          <h1 id="error-title" ref={titleRef} tabIndex={-1} className="system-state__title focus:outline-none">
            Não conseguimos abrir esta página.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            Seus dados permanecem seguros. Tente carregar novamente ou volte ao painel para continuar em outra área.
          </p>
          {error.digest && (
            <p className="mx-auto mt-4 w-fit rounded-lg border border-hairline bg-background/35 px-3 py-1.5 font-mono text-[11px] text-subtle">
              Referência: {error.digest}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={unstable_retry}>
              <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
            </Button>
            <Link href="/dashboard" className={buttonStyles({ variant: 'outline' })}>
              <LayoutDashboard size={16} aria-hidden="true" /> Ir para o painel
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
