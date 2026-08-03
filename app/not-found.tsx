import Link from 'next/link'
import { BookOpen, LibraryBig, MoveLeft } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="system-state-shell">
      <section className="system-state system-state--not-found">
        <span aria-hidden="true" className="system-state__rule" />
        <div className="relative">
          <div className="system-state__seal">
            <BookOpen size={28} aria-hidden="true" />
          </div>
          <p className="eyebrow mb-3 text-scripture">Caminho não encontrado · 404</p>
          <h1 className="system-state__title">Esta página não está neste acervo.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            O endereço pode ter mudado ou o conteúdo pode não estar disponível para esta conta.
          </p>
          <blockquote className="mx-auto mt-6 max-w-sm border-l-2 border-scripture/40 pl-4 text-left font-serif text-sm italic leading-7 text-muted-foreground">
            “Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.”
            <cite className="mt-1 block font-sans text-[11px] not-italic uppercase tracking-[0.1em] text-scripture">Salmo 119:105</cite>
          </blockquote>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className={buttonStyles()}>
              <MoveLeft size={16} aria-hidden="true" /> Voltar ao painel
            </Link>
            <Link href="/biblia" className={buttonStyles({ variant: 'outline' })}>
              <LibraryBig size={16} aria-hidden="true" /> Abrir a Bíblia
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
