'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Church,
  Crown,
  Cross,
  Feather,
  Flame,
  Gift,
  Globe,
  HeartHandshake,
  Landmark,
  Mic,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Sunrise,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { DOUTRINAS } from '@/data/doutrinas'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailHeader, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Feedback'

const DOCTRINE_ICONS: Record<string, LucideIcon> = {
  bibliologia: BookOpen,
  'teologia-propria': Crown,
  cristologia: Cross,
  pneumatologia: Flame,
  antropologia: Users,
  hamartiologia: TriangleAlert,
  soteriologia: Gift,
  eclesiologia: Church,
  escatologia: Sunrise,
  angelologia: Feather,
  apologetica: ShieldCheck,
  missiologia: Globe,
  'etica-crista': Scale,
  patristica: ScrollText,
  'historia-igreja': Landmark,
  'teologia-biblica': BookMarked,
  'aconselhamento-pastoral': HeartHandshake,
  heresiologia: ShieldX,
  hermeneutica: Search,
  homiletica: Mic,
}

function iconForDoctrine(id: string) {
  return DOCTRINE_ICONS[id] ?? BookMarked
}

export default function TeologiaPage() {
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  const [search, setSearch] = useState('')
  const [selectedDoutrina, setSelectedDoutrina] = useState<string | null>(null)
  const [expandedTopico, setExpandedTopico] = useState<number | null>(null)
  const [deepeningKey, setDeepeningKey] = useState<string | null>(null)
  const [deepStudy, setDeepStudy] = useState<Record<string, string>>({})

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = DOUTRINAS.filter((doutrina) => !normalizedSearch
    || doutrina.nome.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    || doutrina.descricao.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
  const doutrinaAtual = DOUTRINAS.find((doutrina) => doutrina.id === selectedDoutrina)
  const deepKey = (doutrinaId: string, index: number) => `${doutrinaId}:${index}`

  const openDoctrine = (id: string) => {
    setSelectedDoutrina(id)
    setExpandedTopico(null)
  }

  const closeDoctrine = () => {
    setSelectedDoutrina(null)
    setExpandedTopico(null)
  }

  const handleDeepen = async (
    doutrinaId: string,
    doutrina: string,
    topico: (typeof DOUTRINAS)[number]['topicos'][number],
    index: number,
  ) => {
    const key = deepKey(doutrinaId, index)
    if (deepStudy[key] || deepeningKey) return
    setDeepeningKey(key)
    try {
      const response = await fetch('/api/ai/teologia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doutrina, topico: topico.titulo, conteudo: topico.conteudo }),
      })
      if (!response.ok) throw new Error('deep-study-failed')
      const data = await response.json() as { text: string }
      setDeepStudy((current) => ({ ...current, [key]: data.text }))
    } catch {
      toast.error('Não foi possível aprofundar o estudo agora.')
    } finally {
      setDeepeningKey(null)
    }
  }

  return (
    <WorkspacePage size="full" archetype="atlas">
      <AnimatePresence mode="wait" initial={false}>
        {!doutrinaAtual ? (
          <motion.div
            key="catalog"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          >
            <PageHeader
              variant="atlas"
              index="Atlas doutrinário · índice sistemático"
              eyebrow={<><BookMarked size={13} /> Cartografia da fé</>}
              title={<>Doutrinas como territórios <span className="text-gradient">conectados.</span></>}
              description={`Percorra ${DOUTRINAS.length} áreas da teologia cristã como um índice progressivo, com base bíblica, relações conceituais e aprofundamento contextual.`}
              aside={
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{DOUTRINAS.length} doutrinas</Badge>
                  <Badge variant="default">{DOUTRINAS.reduce((total, doctrine) => total + doctrine.topicos.length, 0)} tópicos</Badge>
                  <Badge variant="warning"><BookOpen size={11} /> Base bíblica</Badge>
                </div>
              }
            />

            <div className="toolbar-shell">
              <div className="min-w-0 flex-1">
                <Input
                  aria-label="Buscar doutrina"
                  placeholder="Buscar por doutrina, tema ou descrição…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  icon={<Search size={16} />}
                />
              </div>
              <Badge variant="outline">{filtered.length} exibidas</Badge>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                eyebrow="Nenhuma correspondência"
                title="Nenhuma doutrina encontrada."
                description="Tente um termo mais amplo, como igreja, salvação, Bíblia ou escatologia."
              />
            ) : (
              <motion.div
                initial={reduceMotion ? false : 'hidden'}
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.025 } } }}
                className="theology-index atlas-surface"
              >
                {filtered.map((doutrina, index) => {
                  const Icon = iconForDoctrine(doutrina.id)
                  return (
                    <motion.button
                      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                      key={doutrina.id}
                      type="button"
                      onClick={() => openDoctrine(doutrina.id)}
                      className="theology-index__entry group"
                    >
                      <span className="theology-index__number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="theology-index__icon"><Icon size={19} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-lg font-semibold text-foreground transition-colors group-hover:text-info">{doutrina.nome}</span>
                        <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-muted-foreground">{doutrina.descricao}</span>
                      </span>
                      <span className="theology-index__meta">
                        <span>{doutrina.topicos.length} tópicos</span>
                        <ChevronRight size={15} />
                      </span>
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={doutrinaAtual.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          >
            <DetailHeader
              variant="atlas"
              index={`Verbete ${String(DOUTRINAS.findIndex((entry) => entry.id === doutrinaAtual.id) + 1).padStart(2, '0')} · Atlas doutrinário`}
              eyebrow={<><BookMarked size={13} /> Teologia sistemática</>}
              title={doutrinaAtual.nome}
              description={doutrinaAtual.descricao}
              icon={iconForDoctrine(doutrinaAtual.id)}
              meta={<><Badge variant="outline">{doutrinaAtual.topicos.length} tópicos</Badge><Badge variant="warning"><BookOpen size={11} /> Referências bíblicas</Badge></>}
              actions={<Button type="button" variant="ghost" size="sm" onClick={closeDoctrine}><ArrowLeft size={15} /> Todas as doutrinas</Button>}
            />

            <div className="mx-auto max-w-5xl space-y-3">
              {doutrinaAtual.topicos.map((topico, index) => {
                const key = deepKey(doutrinaAtual.id, index)
                const expanded = expandedTopico === index
                const loading = deepeningKey === key
                const triggerId = `doctrine-${doutrinaAtual.id}-${index}-trigger`
                const panelId = `doctrine-${doutrinaAtual.id}-${index}-panel`
                return (
                  <article key={topico.titulo} className="theology-topic">
                    <h2>
                      <button
                        id={triggerId}
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => setExpandedTopico(expanded ? null : index)}
                        className="flex w-full items-center gap-3 p-4 text-left sm:gap-4 sm:p-5"
                      >
                        <span className={cnTopicNumber(expanded)}>{String(index + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground sm:text-lg">{topico.titulo}</span>
                          <span className="mt-1 block text-xs text-subtle">{topico.versiculos.length} {topico.versiculos.length === 1 ? 'referência' : 'referências'} bíblicas</span>
                        </span>
                        <ChevronDown size={19} className={`shrink-0 text-subtle transition-transform ${expanded ? 'rotate-180 text-primary' : ''}`} />
                      </button>
                    </h2>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={triggerId}
                          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-hairline p-4 sm:p-6">
                            <div className="prose max-w-none text-sm sm:text-base">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{topico.conteudo}</ReactMarkdown>
                            </div>

                            <div className="reader-paper mt-6 p-5">
                              <div className="relative">
                                <p className="eyebrow flex items-center gap-2 text-scripture"><BookOpen size={14} /> Base bíblica</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {topico.versiculos.map((verse) => <Badge key={verse} variant="warning">{verse}</Badge>)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                              <Button
                                type="button"
                                variant="secondary"
                                loading={loading}
                                disabled={Boolean(deepStudy[key]) || Boolean(deepeningKey && !loading)}
                                onClick={() => handleDeepen(doutrinaAtual.id, doutrinaAtual.nome, topico, index)}
                              >
                                {!loading && <BrainCircuit size={16} />}
                                {deepStudy[key] ? 'Estudo aprofundado' : 'Aprofundar com IA'}
                              </Button>
                              {!deepStudy[key] && <p className="text-xs text-subtle">Gera contexto histórico, diálogo teológico e aplicação.</p>}
                            </div>

                            {deepStudy[key] && (
                              <motion.section
                                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="form-section form-section--accent mt-6"
                                aria-label="Estudo aprofundado por inteligência artificial"
                              >
                                <p className="eyebrow mb-4 flex items-center gap-2 text-primary-hover"><Sparkles size={14} /> Estudo aprofundado</p>
                                <div className="prose max-w-none text-sm sm:text-base">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{deepStudy[key].replace(/^[ \t]+/gm, '')}</ReactMarkdown>
                                </div>
                              </motion.section>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </WorkspacePage>
  )
}

function cnTopicNumber(expanded: boolean) {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-semibold transition-colors ${
    expanded
      ? 'border-primary/40 bg-primary text-primary-foreground shadow-glow'
      : 'border-hairline bg-elevated text-muted-foreground'
  }`
}
