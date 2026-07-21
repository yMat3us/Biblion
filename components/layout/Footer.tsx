import Link from 'next/link'
import { BookOpen, Quote } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mx-auto mt-14 max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="top-sheen flex flex-col gap-5 rounded-2xl border border-hairline bg-surface/75 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <Link href="/dashboard" className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary-soft text-primary shadow-glow transition-transform group-hover:-rotate-2 group-hover:scale-105">
            <BookOpen size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Biblion</span>
            <span className="block text-[11px] text-subtle">Seu espaço de estudo e preparo</span>
          </span>
        </Link>

        <blockquote className="flex max-w-xl gap-3 border-l border-scripture/20 pl-4 sm:ml-auto">
          <Quote size={15} className="mt-0.5 shrink-0 text-scripture" />
          <p className="font-serif text-xs italic leading-5 text-muted-foreground sm:text-right">
            “Lâmpada para os meus pés é a tua palavra.” <span className="whitespace-nowrap text-scripture">Salmo 119:105</span>
          </p>
        </blockquote>

        <p className="shrink-0 border-t border-hairline pt-4 text-[10px] uppercase tracking-[0.16em] text-subtle sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          © {year}
        </p>
      </div>
    </footer>
  )
}
