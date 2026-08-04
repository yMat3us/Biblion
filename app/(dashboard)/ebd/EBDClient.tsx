'use client'

import { useState } from 'react'

import type { RevistaEBD } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  Library,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspacePage } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type RevistaSummary = Pick<
  RevistaEBD,
  'id' | 'titulo' | 'tema' | 'trimestre' | 'ano' | 'createdAt' | 'updatedAt'
> & { _count: { licoes: number } }

export function EBDClient({ initialRevistas }: { initialRevistas: RevistaSummary[] }) {
  const shouldReduceMotion = useReducedMotion()
  const router = useRouter()

  const totalLessons = initialRevistas.reduce((total, revista) => total + revista._count.licoes, 0)
  const activeYears = new Set(initialRevistas.map((revista) => revista.ano).filter(Boolean)).size

  return (
    <WorkspacePage size="full" archetype="library">
      <PageHeader
        variant="library"
        index="Estante editorial · ciclos de ensino"
        eyebrow={<><GraduationCap size={13} /> Escola Bíblica Dominical</>}
        title={<>Uma coleção para <span className="text-gradient">ensinar com clareza.</span></>}
        description="Organize revistas e lições como uma estante editorial: acompanhe o trimestre, prepare cada encontro e abra recursos contextuais sem perder o fio do ensino."
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline"><Library size={12} /> {initialRevistas.length} {initialRevistas.length === 1 ? 'revista' : 'revistas'}</Badge>
            <Badge variant="outline"><BookOpen size={12} /> {totalLessons} {totalLessons === 1 ? 'lição' : 'lições'}</Badge>
            {activeYears > 0 && <Badge variant="outline"><Calendar size={12} /> {activeYears} {activeYears === 1 ? 'ano' : 'anos'} no acervo</Badge>}
          </div>
        }
        action={
          <Button size="lg" onClick={() => router.push('/ebd/nova-revista')}>
            <Plus size={17} /> Adicionar revista
          </Button>
        }
      />

      {initialRevistas.length > 0 && (
        <section className="ebd-ledger" aria-label="Resumo da Escola Bíblica">
          {[
            { label: 'Revistas na estante', value: initialRevistas.length, icon: Library, detail: 'coleções organizadas' },
            { label: 'Lições disponíveis', value: totalLessons, icon: BookOpen, detail: 'encontros para preparar' },
            { label: 'Períodos catalogados', value: activeYears || '—', icon: Calendar, detail: activeYears ? 'anos representados' : 'sem ano informado' },
          ].map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="ebd-ledger__entry">
                <span className="ebd-ledger__index">{String(index + 1).padStart(2, '0')}</span>
                <Icon size={16} />
                <span><strong>{metric.value}</strong><small>{metric.label}</small></span>
                <em>{metric.detail}</em>
              </div>
            )
          })}
        </section>
      )}

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="index-label mb-1.5">Coleções trimestrais</p>
          <h2 className="font-serif text-xl font-semibold text-foreground">Revistas na estante</h2>
        </div>
        {initialRevistas.length > 0 && <p className="text-xs text-subtle">Ordenadas pelas mais recentes</p>}
      </div>

      {initialRevistas.length === 0 ? (
        <section className="library-empty-state" aria-labelledby="empty-library-title">
          <span className="library-empty-state__seal"><Library size={24} /></span>
          <p className="index-label text-primary-hover">Primeiro volume</p>
          <h2 id="empty-library-title">Comece sua estante de EBD</h2>
          <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Cadastre uma revista, organize as lições e mantenha todo o preparo das aulas em um único lugar.
          </p>
          <Button className="relative mt-7" onClick={() => router.push('/ebd/nova-revista')}>
            <Plus size={16} /> Adicionar primeira revista
          </Button>
        </section>
      ) : (
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ebd-shelf"
        >
          {initialRevistas.map((revista) => <RevistaCard key={revista.id} revista={revista} />)}
        </motion.section>
      )}
    </WorkspacePage>
  )
}

function RevistaCard({ revista }: { revista: RevistaSummary }) {
  const [showCover, setShowCover] = useState(true)
  const period = [revista.trimestre, revista.ano].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/ebd/revista/${revista.id}`}
      className="ebd-volume group"
    >
      <span className="ebd-volume__spine" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgb(130_92_246/0.2),transparent_38%),linear-gradient(145deg,#171c31,#0b0f1a_60%)]">
        <div aria-hidden="true" className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgb(255_255_255/0.08)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <span className="icon-tile mb-4 h-12 w-12"><GraduationCap size={21} /></span>
          <p className="line-clamp-3 text-base font-semibold text-foreground">{revista.titulo}</p>
        </div>
      </div>

      {showCover && (
        <Image
          src={`/api/ebd/revistas/${revista.id}/capa`}
          alt={`Capa da revista ${revista.titulo}`}
          fill
          sizes="(max-width: 429px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 20vw"
          unoptimized
          loading="lazy"
          decoding="async"
          onError={() => setShowCover(false)}
          className="absolute inset-0 object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="relative p-5">
        {period && <p className="mb-2 text-[10px] font-semibold tracking-[0.11em] text-primary-hover uppercase">{period}</p>}
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white">{revista.titulo}</h3>
        {revista.tema && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/65">{revista.tema}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-white/65"><FileText size={13} /> {revista._count.licoes} {revista._count.licoes === 1 ? 'lição' : 'lições'}</span>
          <span className="flex items-center gap-1 text-white transition-transform group-hover:translate-x-1">Abrir <ArrowRight size={13} /></span>
        </div>
      </div>
    </Link>
  )
}
