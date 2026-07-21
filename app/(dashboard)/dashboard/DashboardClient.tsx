'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  LibraryBig,
  Mic,
  PenTool,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonStyles } from '@/components/ui/Button'

const STAT_META = [
  { key: 'sermoes', label: 'Sermões', descriptor: 'mensagens preparadas', icon: Mic, href: '/sermoes', tone: 'primary', index: 'I' },
  { key: 'esbocos', label: 'Esboços', descriptor: 'linhas de pregação', icon: FileText, href: '/esbocos', tone: 'info', index: 'II' },
  { key: 'anotacoes', label: 'Anotações', descriptor: 'margens preservadas', icon: BookMarked, href: '/anotacoes', tone: 'scripture', index: 'III' },
  { key: 'licoes', label: 'Lições EBD', descriptor: 'aulas no acervo', icon: GraduationCap, href: '/ebd', tone: 'success', index: 'IV' },
] as const

const QUICK_PATHS = [
  { href: '/busca', label: 'Investigar um tema', description: 'Cruze Bíblia, sermões e lições.', icon: Search },
  { href: '/teologia', label: 'Abrir o índice teológico', description: 'Navegue por doutrinas e tópicos.', icon: LibraryBig },
  { href: '/ebd', label: 'Preparar uma aula', description: 'Retome revistas e lições.', icon: GraduationCap },
] as const

const toneClasses = {
  primary: 'border-primary/20 bg-primary-soft text-primary',
  info: 'border-info/20 bg-info/10 text-info',
  scripture: 'border-scripture/20 bg-scripture-soft text-scripture',
  success: 'border-success/20 bg-success/10 text-success',
}

interface DashboardFeedItem {
  id: string
  type: string
  titulo: string | null
  updatedAt: string | Date
}

interface DashboardData {
  sermoes: number
  esbocos: number
  anotacoes: number
  licoes: number
  feedItems: DashboardFeedItem[]
}

export function DashboardClient({
  data,
  userName,
  today,
}: {
  data: DashboardData
  userName: string
  today: string
}) {
  const [filter, setFilter] = useState<'todos' | 'sermão' | 'estudo'>('todos')
  const shouldReduceMotion = useReducedMotion()
  const totalItens = data.sermoes + data.esbocos + data.anotacoes + data.licoes
  const feed = data.feedItems.filter((entry) => filter === 'todos' || entry.type === filter)

  const formatDate = (date: string | Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date))

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: shouldReduceMotion ? 0 : 0.07 } },
  }
  const item = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    show: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0 : 0.32 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      data-archetype="folio"
      className="workspace-page page-container"
    >
      <motion.section variants={item} className="dashboard-folio folio-surface" data-folio="FÓLIO 01">
        <div className="dashboard-folio__intro">
          <div className="dashboard-folio__date">
            <span aria-hidden="true" className="dashboard-folio__date-mark" />
            <span>{today}</span>
          </div>
          <h1>
            Olá, <span>{userName}</span>.<br />
            Este é o seu fólio de hoje.
          </h1>
          <p>Leia com atenção, registre o que importa e transforme estudo em serviço.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/biblia" className={buttonStyles({ size: 'lg', className: 'sm:min-w-44' })}>
              <BookOpen size={18} /> Abrir a Bíblia <ArrowRight size={15} />
            </Link>
            <Link href="/sermoes/novo" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
              <Plus size={17} /> Iniciar manuscrito
            </Link>
          </div>
        </div>

        <div className="dashboard-folio__scripture">
          <div className="dashboard-folio__chapter" aria-hidden="true">119</div>
          <p className="index-label text-scripture">Palavra para o caminho</p>
          <blockquote>“Lâmpada para os meus pés é tua palavra e luz para o meu caminho.”</blockquote>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-scripture/15 pt-4">
            <cite>Salmos 119:105</cite>
            <Link href="/biblia/Salmos" className="inline-flex items-center gap-1.5 text-xs font-semibold text-scripture transition-colors hover:text-foreground">
              Ler no contexto <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} className="dashboard-ledger" aria-labelledby="archive-summary-title">
        <div className="dashboard-ledger__heading">
          <div>
            <p className="index-label">Índice do acervo</p>
            <h2 id="archive-summary-title">Seu trabalho, em perspectiva</h2>
          </div>
          <p><strong>{totalItens}</strong> {totalItens === 1 ? 'registro organizado' : 'registros organizados'}</p>
        </div>
        <div className="dashboard-ledger__grid">
          {STAT_META.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.key} href={stat.href} className="dashboard-ledger__entry group">
                <span className="dashboard-ledger__index" aria-hidden="true">{stat.index}</span>
                <span className={cn('dashboard-ledger__icon', toneClasses[stat.tone])}><Icon size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{stat.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{stat.descriptor}</span>
                </span>
                <strong className="folio-number text-3xl">{data[stat.key]}</strong>
                <ArrowRight size={14} className="dashboard-ledger__arrow" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </motion.section>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <motion.section variants={item} className="manuscript-surface xl:col-span-8" aria-labelledby="recent-activity-title">
          <div className="dashboard-section-heading">
            <div>
              <p className="index-label">Registro cronológico</p>
              <h2 id="recent-activity-title">Atividade recente</h2>
            </div>
            <div className="dashboard-filter" aria-label="Filtrar atividade">
              {(['todos', 'sermão', 'estudo'] as const).map((value) => {
                const label = value === 'sermão' ? 'Sermões' : value === 'estudo' ? 'Notas' : 'Tudo'
                return (
                  <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {feed.length > 0 ? (
            <ol className="dashboard-timeline">
              {feed.slice(0, 7).map((entry, index) => {
                const sermon = entry.type === 'sermão'
                return (
                  <li key={`${entry.type}-${entry.id}`}>
                    <Link href={sermon ? `/sermoes/${entry.id}` : '/anotacoes'} className="dashboard-timeline__entry group">
                      <span className="dashboard-timeline__number">{String(index + 1).padStart(2, '0')}</span>
                      <span className={cn('dashboard-timeline__icon', sermon ? toneClasses.primary : toneClasses.scripture)}>
                        {sermon ? <Mic size={15} /> : <PenTool size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{entry.titulo || 'Sem título'}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={11} /> {formatDate(entry.updatedAt)}
                          <span aria-hidden="true">·</span> {sermon ? 'Manuscrito' : 'Marginalia'}
                        </span>
                      </span>
                      <ChevronRight size={15} className="text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-scripture/20 bg-scripture-soft text-scripture"><BookMarked size={19} /></span>
              <h3 className="font-serif text-xl font-semibold text-foreground">A primeira página está em branco.</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Crie um sermão ou registre uma anotação para iniciar sua cronologia.</p>
            </div>
          )}
        </motion.section>

        <motion.aside variants={item} className="space-y-5 xl:col-span-4">
          <section className="cabinet-surface p-5 sm:p-6" aria-labelledby="tutor-card-title">
            <div className="mb-7 flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-primary-soft text-primary"><BrainCircuit size={18} /></span>
              <span className="index-label text-primary-hover">Gabinete · IA</span>
            </div>
            <h2 id="tutor-card-title" className="max-w-xs font-serif text-[1.65rem] font-semibold leading-tight text-foreground">Uma boa pergunta pode abrir o texto.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Peça contexto, conexões, aplicações ou ajuda para organizar seu raciocínio.</p>
            <Link href="/tutor" className={buttonStyles({ size: 'md', className: 'mt-6 w-full' })}>
              <Sparkles size={16} /> Entrar no gabinete <ArrowRight size={14} />
            </Link>
          </section>

          <section className="marginalia-surface p-5 sm:p-6" aria-labelledby="continuity-title">
            <p className="index-label text-scripture">Próximos movimentos</p>
            <h2 id="continuity-title" className="mt-2 font-serif text-xl font-semibold text-foreground">Continue de onde a curiosidade levar.</h2>
            <div className="mt-5 divide-y divide-hairline">
              {QUICK_PATHS.map(({ href, label, description, icon: Icon }, index) => (
                <Link key={href} href={href} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-5 text-[10px] font-semibold text-subtle">{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={15} className="shrink-0 text-scripture" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight size={13} className="text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </motion.aside>
      </div>
    </motion.div>
  )
}
