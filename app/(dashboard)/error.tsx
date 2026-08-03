'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button, buttonStyles } from '@/components/ui/Button'

/**
 * Fronteira de erro por segmento do dashboard. Renderiza DENTRO do chrome
 * (sidebar/cabeçalho permanecem): uma falha numa página degrada apenas a área de
 * conteúdo, com opção de retry, em vez de derrubar a aplicação inteira.
 */
export default function DashboardSegmentError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      role="alert"
      className="app-panel mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span aria-hidden="true" className="icon-tile mb-5 text-destructive">
        <TriangleAlert size={22} />
      </span>
      <h1 className="text-xl font-semibold text-foreground">Algo deu errado nesta seção.</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Seus dados permanecem seguros. Tente carregar novamente ou volte ao painel para continuar em outra área.
      </p>
      {error.digest && (
        <p className="mt-4 rounded-lg border border-hairline bg-background/35 px-3 py-1.5 font-mono text-[11px] text-subtle">
          Referência: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={unstable_retry}>
          <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
        </Button>
        <Link href="/dashboard" className={buttonStyles({ variant: 'outline' })}>
          <LayoutDashboard size={16} aria-hidden="true" /> Ir para o painel
        </Link>
      </div>
    </div>
  )
}
