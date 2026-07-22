'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  HeartHandshake,
  Layers,
  ListTree,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailHeader, EditorActionBar, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { VerseSelector } from '@/components/ui/VerseSelector'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface EsbocoItem {
  nivel: number
  texto: string
  versiculo?: string
}

interface EsbocoApiResponse {
  id: string
  titulo: string
  textoBase: string | null
  conteudo: string
  categoria: string | null
  createdAt: string
}

interface EsbocoLocal extends EsbocoApiResponse {
  itens: EsbocoItem[]
}

type LoadStatus = 'loading' | 'success' | 'error'
type View = 'list' | 'editor' | 'detail'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseEsbocoItens(conteudo: string): EsbocoItem[] {
  if (!conteudo) return []
  try {
    const parsed: unknown = JSON.parse(conteudo)
    if (Array.isArray(parsed)) {
      return parsed.flatMap((value) => {
        if (!isRecord(value) || typeof value.nivel !== 'number' || typeof value.texto !== 'string') return []
        return [{
          nivel: Math.min(3, Math.max(1, value.nivel)),
          texto: value.texto,
          versiculo: typeof value.versiculo === 'string' ? value.versiculo : '',
        }]
      })
    }
  } catch {
    // Conteúdo legado é apresentado como um ponto principal.
  }
  return [{ nivel: 1, texto: conteudo, versiculo: '' }]
}

function normalizeOutline(esboco: EsbocoApiResponse): EsbocoLocal {
  return { ...esboco, itens: parseEsbocoItens(esboco.conteudo) }
}

async function buscarEsbocos(): Promise<EsbocoLocal[]> {
  const response = await fetch('/api/esbocos')
  if (!response.ok) throw new Error('outlines-fetch-failed')
  const data: EsbocoApiResponse[] = await response.json()
  return data.map(normalizeOutline)
}

const MODELOS_RAPIDOS: Array<{
  nome: string
  icon: ComponentType<{ size?: number; className?: string }>
  descricao: string
  itens: EsbocoItem[]
}> = [
  {
    nome: 'Sermão de três movimentos',
    icon: ListTree,
    descricao: 'Estrutura homilética clássica, com introdução, desenvolvimento e apelo.',
    itens: [
      { nivel: 1, texto: 'Introdução', versiculo: '' },
      { nivel: 1, texto: 'I. Primeiro ponto principal', versiculo: '' },
      { nivel: 2, texto: 'A. Explicação', versiculo: '' },
      { nivel: 2, texto: 'B. Aplicação', versiculo: '' },
      { nivel: 1, texto: 'II. Segundo ponto principal', versiculo: '' },
      { nivel: 2, texto: 'A. Explicação', versiculo: '' },
      { nivel: 2, texto: 'B. Aplicação', versiculo: '' },
      { nivel: 1, texto: 'III. Terceiro ponto principal', versiculo: '' },
      { nivel: 1, texto: 'Conclusão e apelo', versiculo: '' },
    ],
  },
  {
    nome: 'Estudo bíblico',
    icon: BookMarked,
    descricao: 'Contexto, análise, teologia e aplicação contemporânea em sequência.',
    itens: [
      { nivel: 1, texto: 'Contexto histórico', versiculo: '' },
      { nivel: 1, texto: 'Análise do texto', versiculo: '' },
      { nivel: 2, texto: 'Vocabulário-chave', versiculo: '' },
      { nivel: 2, texto: 'Estrutura do texto', versiculo: '' },
      { nivel: 1, texto: 'Teologia do texto', versiculo: '' },
      { nivel: 1, texto: 'Aplicação contemporânea', versiculo: '' },
      { nivel: 2, texto: 'Pessoal', versiculo: '' },
      { nivel: 2, texto: 'Eclesial', versiculo: '' },
      { nivel: 2, texto: 'Missionária', versiculo: '' },
    ],
  },
  {
    nome: 'Devocional guiado',
    icon: HeartHandshake,
    descricao: 'Leitura, reflexão, resposta pessoal e oração em um fluxo simples.',
    itens: [
      { nivel: 1, texto: 'Abertura em oração', versiculo: '' },
      { nivel: 1, texto: 'Leitura do texto', versiculo: '' },
      { nivel: 1, texto: 'Reflexão pessoal', versiculo: '' },
      { nivel: 2, texto: 'O que Deus revela?', versiculo: '' },
      { nivel: 2, texto: 'O que devo transformar?', versiculo: '' },
      { nivel: 2, texto: 'Como posso responder?', versiculo: '' },
      { nivel: 1, texto: 'Oração final', versiculo: '' },
    ],
  },
]

export default function EsbocosPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const reduceMotion = useReducedMotion()
  const searchParams = useSearchParams()
  const [esbocos, setEsbocos] = useState<EsbocoLocal[]>([])
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [view, setView] = useState<View>(() => searchParams.get('novo') === '1' ? 'editor' : 'list')
  const [selectedEsboco, setSelectedEsboco] = useState<EsbocoLocal | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [textoBase, setTextoBase] = useState('')
  const [itens, setItens] = useState<EsbocoItem[]>([{ nivel: 1, texto: '', versiculo: '' }])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const refreshOutlines = async () => {
    const data = await buscarEsbocos()
    setEsbocos(data)
    setLoadStatus('success')
    return data
  }

  useEffect(() => {
    let cancelled = false
    void buscarEsbocos()
      .then((data) => {
        if (!cancelled) {
          setEsbocos(data)
          setLoadStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  const resetEditor = () => {
    setEditingId(null)
    setTitulo('')
    setTextoBase('')
    setItens([{ nivel: 1, texto: '', versiculo: '' }])
  }

  const openNew = () => {
    resetEditor()
    setView('editor')
  }

  const openEdit = (esboco: EsbocoLocal) => {
    setEditingId(esboco.id)
    setTitulo(esboco.titulo)
    setTextoBase(esboco.textoBase ?? '')
    setItens(esboco.itens.length > 0 ? esboco.itens : [{ nivel: 1, texto: '', versiculo: '' }])
    setView('editor')
  }

  const openDetail = (esboco: EsbocoLocal) => {
    setSelectedEsboco(esboco)
    setView('detail')
  }

  const addItem = (nivel = 1) => setItens((current) => [...current, { nivel, texto: '', versiculo: '' }])
  const removeItem = (index: number) => setItens((current) => current.filter((_, itemIndex) => itemIndex !== index))
  const updateItem = (index: number, field: keyof EsbocoItem, value: string | number) => {
    setItens((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  const salvarEsboco = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!titulo.trim()) {
      toast.error('Dê um título ao esboço antes de salvar.')
      return
    }
    if (itens.every((item) => !item.texto.trim())) {
      toast.error('Adicione ao menos um ponto ao esboço.')
      return
    }

    const editedId = editingId
    setSaving(true)
    try {
      const response = await fetch(editedId ? `/api/esbocos/${editedId}` : '/api/esbocos', {
        method: editedId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          textoBase,
          conteudo: JSON.stringify(itens),
          modelo: 'Personalizado',
          categoria: 'Geral',
        }),
      })
      if (!response.ok) throw new Error('outline-save-failed')
      const saved = normalizeOutline(await response.json() as EsbocoApiResponse)
      setEsbocos((current) => editedId
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current])
      setLoadStatus('success')
      setView('list')
      resetEditor()
      toast.success(editedId ? 'Esboço atualizado.' : 'Esboço salvo.')
    } catch {
      toast.error('Não foi possível salvar o esboço.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEsboco = async (esboco: EsbocoLocal) => {
    const accepted = await confirm({
      title: 'Excluir esboço',
      message: `O esboço “${esboco.titulo}” será removido permanentemente.`,
      danger: true,
      confirmText: 'Excluir',
    })
    if (!accepted) return
    try {
      const response = await fetch(`/api/esbocos/${esboco.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('outline-delete-failed')
      setEsbocos((current) => current.filter((item) => item.id !== esboco.id))
      if (selectedEsboco?.id === esboco.id) setView('list')
      toast.success('Esboço excluído.')
    } catch {
      toast.error('Não foi possível excluir o esboço.')
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = esbocos.filter((esboco) => !normalizedSearch
    || esboco.titulo.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    || esboco.textoBase?.toLocaleLowerCase('pt-BR').includes(normalizedSearch))

  if (view === 'editor') {
    return (
      <WorkspacePage size="full" archetype="manuscript">
        <DetailHeader
          variant="manuscript"
          index={editingId ? 'Linha argumental · revisão' : 'Linha argumental · nova estrutura'}
          eyebrow={<><ListTree size={13} /> Oficina de estrutura</>}
          title={editingId ? 'Editar esboço' : 'Novo esboço'}
          description="Organize o raciocínio em níveis claros, conecte referências e mantenha a mensagem legível em qualquer tela."
          icon={Layers}
          actions={<Button type="button" variant="ghost" size="sm" onClick={() => setView('list')}><ArrowLeft size={15} /> Voltar ao acervo</Button>}
        />

        <form onSubmit={salvarEsboco} className="outline-editor">
          <div className="editor-grid">
            <div className="space-y-5">
              <section className="form-section form-section--accent space-y-5">
                <SectionHeading icon={FileText} title="Fundamento" description="Defina um título memorável e o texto que orienta a estrutura." />
                <Input
                  label="Título do esboço"
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  required
                  maxLength={300}
                  autoFocus
                  placeholder="Ex.: O fruto do Espírito"
                />
                <VerseSelector
                  label="Texto base"
                  value={textoBase}
                  onChange={setTextoBase}
                  placeholder="Selecione a passagem principal"
                />
              </section>

              <section className="form-section">
                <SectionHeading
                  icon={ListTree}
                  title="Estrutura da mensagem"
                  description={`${itens.length} ${itens.length === 1 ? 'bloco organizado' : 'blocos organizados'} em até três níveis.`}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => addItem(1)}><Plus size={13} /> Ponto</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => addItem(2)}><Plus size={13} /> Subponto</Button>
                    </div>
                  }
                />

                <div className="space-y-3">
                  {itens.map((item, index) => (
                    <div
                      key={index}
                      data-level={item.nivel}
                      className={cn(
                        'outline-editor__block',
                        item.nivel === 2 && 'sm:ml-6',
                        item.nivel === 3 && 'sm:ml-12',
                      )}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className={cn(
                          'flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-semibold uppercase tracking-wider',
                          item.nivel === 1 ? 'bg-primary text-primary-foreground' : 'border border-hairline bg-elevated text-muted-foreground',
                        )}>
                          {item.nivel === 1 ? index + 1 : `N${item.nivel}`}
                        </span>
                        <select
                          aria-label={`Nível do bloco ${index + 1}`}
                          value={item.nivel}
                          onChange={(event) => updateItem(index, 'nivel', Number(event.target.value))}
                          className="h-8 rounded-lg border border-hairline bg-elevated px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                        >
                          <option value={1}>Ponto principal</option>
                          <option value={2}>Subponto</option>
                          <option value={3}>Detalhe</option>
                        </select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label={`Remover bloco ${index + 1}`} className="ml-auto h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
                        <Textarea
                          aria-label={`Texto do bloco ${index + 1}`}
                          placeholder={item.nivel === 1 ? 'Título e desenvolvimento do ponto principal…' : 'Subponto, explicação ou aplicação…'}
                          value={item.texto}
                          onChange={(event) => updateItem(index, 'texto', event.target.value)}
                          rows={3}
                          className="min-h-24"
                        />
                        <VerseSelector
                          value={item.versiculo ?? ''}
                          onChange={(reference) => updateItem(index, 'versiculo', reference)}
                          placeholder="Referência de apoio"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" onClick={() => addItem(1)} className="mt-4 w-full border-dashed">
                  <Plus size={15} /> Adicionar novo bloco
                </Button>
              </section>
            </div>

            <aside className="outline-template-index form-section h-fit xl:sticky xl:top-6">
              <SectionHeading icon={Sparkles} title="Pontos de partida" description="Aplique uma estrutura pronta e personalize cada bloco." />
              <div className="space-y-2.5">
                {MODELOS_RAPIDOS.map((modelo) => {
                  const Icon = modelo.icon
                  return (
                    <button
                      key={modelo.nome}
                      type="button"
                      onClick={() => setItens(modelo.itens.map((item) => ({ ...item })))}
                      className="group w-full rounded-xl border border-hairline bg-background/25 p-3.5 text-left transition-all hover:border-primary/25 hover:bg-primary-soft"
                    >
                      <span className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-primary transition-colors group-hover:bg-primary group-hover:text-white"><Icon size={16} /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{modelo.nome}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{modelo.descricao}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 border-t border-hairline pt-4 text-[11px] leading-5 text-subtle">Aplicar um modelo substitui os blocos atualmente no editor.</p>
            </aside>
          </div>

          <EditorActionBar status={editingId ? 'Você está atualizando um esboço existente.' : 'O esboço ficará privado no seu acervo.'}>
            <Button type="button" variant="ghost" onClick={() => setView('list')} className="flex-1 sm:flex-none">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1 sm:flex-none"><Save size={16} /> {editingId ? 'Salvar alterações' : 'Salvar esboço'}</Button>
          </EditorActionBar>
        </form>
      </WorkspacePage>
    )
  }

  if (view === 'detail' && selectedEsboco) {
    return (
      <WorkspacePage size="compact" archetype="manuscript">
        <DetailHeader
          variant="manuscript"
          index="Linha argumental · documento salvo"
          eyebrow={<><FileText size={13} /> Esboço salvo</>}
          title={selectedEsboco.titulo}
          description={`Criado em ${new Date(selectedEsboco.createdAt).toLocaleString('pt-BR')}`}
          icon={ListTree}
          meta={selectedEsboco.textoBase ? <Badge variant="warning"><BookOpen size={12} /> {selectedEsboco.textoBase}</Badge> : undefined}
          actions={
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => setView('list')}><ArrowLeft size={15} /> Acervo</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => openEdit(selectedEsboco)}><Edit2 size={14} /> Editar</Button>
            </>
          }
        />

        <article className="outline-document reader-paper p-5 sm:p-8 xl:p-10">
          <div className="relative space-y-3">
            {selectedEsboco.itens.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'rounded-xl border-l-2 px-4 py-3 transition-colors hover:bg-elevated/35',
                  item.nivel === 1 && 'border-primary/60',
                  item.nivel === 2 && 'border-hairline-strong sm:ml-7',
                  item.nivel === 3 && 'border-hairline sm:ml-14',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 shrink-0 font-mono text-xs font-semibold', item.nivel === 1 ? 'text-primary' : 'text-subtle')}>
                    {item.nivel === 1 ? String(index + 1).padStart(2, '0') : item.nivel === 2 ? '—' : '·'}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('whitespace-pre-wrap leading-7', item.nivel === 1 ? 'text-base font-semibold text-foreground sm:text-lg' : 'text-sm text-muted-foreground')}>{item.texto}</p>
                    {item.versiculo && <Badge variant="warning" className="mt-2"><BookOpen size={11} /> {item.versiculo}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </WorkspacePage>
    )
  }

  return (
    <WorkspacePage size="full">
      <PageHeader
        variant="manuscript"
        index="Oficina homilética · linhas argumentais"
        eyebrow={<><ListTree size={13} /> Oficina de ideias</>}
        title={<>Encontre a linha antes de <span className="text-gradient">preencher a página.</span></>}
        description="Transforme pensamentos soltos em uma linha clara de ensino, pregação ou estudo — do texto base à aplicação."
        action={<Button onClick={openNew}><Plus size={16} /> Novo esboço</Button>}
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{esbocos.length} {esbocos.length === 1 ? 'esboço' : 'esboços'}</Badge>
            <Badge variant="default"><Layers size={12} /> {esbocos.reduce((total, item) => total + item.itens.length, 0)} blocos</Badge>
          </div>
        }
      />

      <div className="manuscript-toolbar">
        <div className="min-w-0 flex-1">
          <Input aria-label="Buscar esboços" placeholder="Buscar por título ou texto base…" value={search} onChange={(event) => setSearch(event.target.value)} icon={<Search size={16} />} />
        </div>
        <Button type="button" variant="outline" onClick={openNew}><Plus size={15} /> Criar estrutura</Button>
      </div>

      {loadStatus === 'loading' && (
        <div role="status" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Carregando esboços…</span>
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="skeleton h-64 rounded-2xl" />)}
        </div>
      )}

      {loadStatus === 'error' && (
        <EmptyState
          icon={FileText}
          eyebrow="Acervo indisponível"
          title="Não foi possível carregar seus esboços."
          description="Tente sincronizar novamente o acervo desta conta."
          action={<Button onClick={() => { setLoadStatus('loading'); void refreshOutlines().catch(() => setLoadStatus('error')) }}>Tentar novamente</Button>}
        />
      )}

      {loadStatus === 'success' && filtered.length === 0 && (
        <EmptyState
          icon={FileText}
          eyebrow={esbocos.length === 0 ? 'Acervo vazio' : 'Nenhuma correspondência'}
          title={esbocos.length === 0 ? 'Comece pela estrutura, não pela página em branco.' : 'Nenhum esboço encontrado.'}
          description={esbocos.length === 0 ? 'Escolha um modelo ou monte sua própria sequência de pontos.' : 'Tente outro título ou referência bíblica.'}
          action={esbocos.length === 0 ? <Button onClick={openNew}><Plus size={16} /> Criar primeiro esboço</Button> : undefined}
        />
      )}

      {loadStatus === 'success' && filtered.length > 0 && (
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
          className="outline-archive"
        >
          {filtered.map((esboco, index) => (
            <motion.article
              key={esboco.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className="outline-record group"
            >
              <span className="outline-record__folio" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex items-start justify-between gap-3">
                <span className="icon-tile"><FileText size={17} /></span>
                <Badge variant="outline">{esboco.itens.length} {esboco.itens.length === 1 ? 'bloco' : 'blocos'}</Badge>
              </div>
              <button type="button" onClick={() => openDetail(esboco)} className="mt-6 min-w-0 flex-1 text-left">
                <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary-hover">{esboco.titulo}</h2>
                {esboco.textoBase && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-scripture"><BookOpen size={13} /> {esboco.textoBase}</p>}
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{esboco.itens.map((item) => item.texto).filter(Boolean).slice(0, 3).join(' · ') || 'Estrutura ainda sem conteúdo.'}</p>
              </button>
              <div className="mt-5 flex items-center gap-1 border-t border-hairline pt-4">
                <span className="mr-auto text-xs text-subtle">{new Date(esboco.createdAt).toLocaleDateString('pt-BR')}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => openDetail(esboco)} aria-label={`Abrir ${esboco.titulo}`} className="h-9 w-9"><Eye size={14} /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(esboco)} aria-label={`Editar ${esboco.titulo}`} className="h-9 w-9"><Edit2 size={14} /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteEsboco(esboco)} aria-label={`Excluir ${esboco.titulo}`} className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></Button>
                <ChevronRight size={14} className="ml-1 text-subtle" />
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
    </WorkspacePage>
  )
}
