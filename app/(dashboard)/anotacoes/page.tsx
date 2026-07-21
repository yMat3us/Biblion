'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlignLeft,
  ArrowLeft,
  Edit2,
  FilePenLine,
  Palette,
  PenTool,
  Pin,
  PinOff,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DetailHeader, EditorActionBar, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useConfirm, useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface AnotacaoApiResponse {
  id: string
  titulo: string | null
  conteudo: string
  tags: string[]
  fixada: boolean
  cor: string
  createdAt: string
}

interface Anotacao {
  id: string
  titulo: string
  conteudo: string
  tags: string[]
  fixada: boolean
  cor: string
  createdAt: string
}

type LoadStatus = 'loading' | 'success' | 'error'

function normalizeNote(anotacao: AnotacaoApiResponse): Anotacao {
  return {
    id: anotacao.id,
    titulo: anotacao.titulo ?? '',
    conteudo: anotacao.conteudo,
    tags: anotacao.tags,
    fixada: anotacao.fixada,
    cor: anotacao.cor,
    createdAt: anotacao.createdAt,
  }
}

async function buscarAnotacoes(): Promise<Anotacao[]> {
  const response = await fetch('/api/anotacoes')
  if (!response.ok) throw new Error('notes-fetch-failed')

  const data: AnotacaoApiResponse[] = await response.json()
  return data.map(normalizeNote)
}

const NOTE_TONES = {
  default: { label: 'Grafite', dot: 'bg-subtle', shell: 'border-hairline bg-surface', line: 'bg-subtle' },
  amber: { label: 'Dourado', dot: 'bg-scripture', shell: 'border-scripture/20 bg-[linear-gradient(145deg,rgb(232_188_105/0.07),transparent_44%),var(--color-surface)]', line: 'bg-scripture' },
  blue: { label: 'Azul', dot: 'bg-info', shell: 'border-info/20 bg-[linear-gradient(145deg,rgb(86_163_255/0.07),transparent_44%),var(--color-surface)]', line: 'bg-info' },
  rose: { label: 'Rosa', dot: 'bg-destructive', shell: 'border-destructive/20 bg-[linear-gradient(145deg,rgb(241_111_122/0.065),transparent_44%),var(--color-surface)]', line: 'bg-destructive' },
  purple: { label: 'Violeta', dot: 'bg-primary', shell: 'border-primary/20 bg-[linear-gradient(145deg,var(--color-primary-soft),transparent_44%),var(--color-surface)]', line: 'bg-primary' },
  emerald: { label: 'Verde', dot: 'bg-success', shell: 'border-success/20 bg-[linear-gradient(145deg,rgb(75_209_154/0.06),transparent_44%),var(--color-surface)]', line: 'bg-success' },
} as const

const COLOR_OPTIONS = Object.keys(NOTE_TONES) as Array<keyof typeof NOTE_TONES>

function normalizeColor(color: string): keyof typeof NOTE_TONES {
  return color in NOTE_TONES ? color as keyof typeof NOTE_TONES : 'default'
}

function parseTags(value: string) {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 12)
}

export default function AnotacoesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const reduceMotion = useReducedMotion()
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([])
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string>('Todas')
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingNote, setEditingNote] = useState<Anotacao | null>(null)
  const [saving, setSaving] = useState(false)
  const [formTitulo, setFormTitulo] = useState('')
  const [formConteudo, setFormConteudo] = useState('')
  const [formCor, setFormCor] = useState<keyof typeof NOTE_TONES>('amber')
  const [formTags, setFormTags] = useState('')

  const refreshNotes = async () => {
    const data = await buscarAnotacoes()
    setAnotacoes(data)
    setLoadStatus('success')
  }

  useEffect(() => {
    let cancelled = false
    void buscarAnotacoes()
      .then((data) => {
        if (!cancelled) {
          setAnotacoes(data)
          setLoadStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  const openNew = () => {
    setEditingNote(null)
    setFormTitulo('')
    setFormConteudo('')
    setFormCor('amber')
    setFormTags('')
    setView('editor')
  }

  const openEdit = (nota: Anotacao) => {
    setEditingNote(nota)
    setFormTitulo(nota.titulo)
    setFormConteudo(nota.conteudo)
    setFormCor(normalizeColor(nota.cor))
    setFormTags(nota.tags.join(', '))
    setView('editor')
  }

  const allTags = ['Todas', ...new Set(anotacoes.flatMap((anotacao) => anotacao.tags))]
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const filtered = anotacoes.filter((anotacao) => {
    const matchSearch = !normalizedSearch
      || anotacao.titulo.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      || anotacao.conteudo.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    const matchTag = activeTag === 'Todas' || anotacao.tags.includes(activeTag)
    return matchSearch && matchTag
  })
  const pinned = filtered.filter((anotacao) => anotacao.fixada)
  const unpinned = filtered.filter((anotacao) => !anotacao.fixada)

  const togglePin = async (nota: Anotacao) => {
    const nextPinned = !nota.fixada
    setAnotacoes((current) => current.map((item) => item.id === nota.id ? { ...item, fixada: nextPinned } : item))
    try {
      const response = await fetch(`/api/anotacoes/${nota.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixada: nextPinned }),
      })
      if (!response.ok) throw new Error('pin-failed')
    } catch {
      setAnotacoes((current) => current.map((item) => item.id === nota.id ? { ...item, fixada: nota.fixada } : item))
      toast.error('Não foi possível atualizar a fixação.')
    }
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formTitulo.trim() || !formConteudo.trim()) {
      toast.error('Preencha título e conteúdo.')
      return
    }

    setSaving(true)
    const payload = {
      titulo: formTitulo.trim(),
      conteudo: formConteudo.trim(),
      cor: formCor,
      tags: parseTags(formTags),
      ...(editingNote ? {} : { fixada: false }),
    }
    const wasEditing = Boolean(editingNote)
    try {
      const response = await fetch(editingNote ? `/api/anotacoes/${editingNote.id}` : '/api/anotacoes', {
        method: editingNote ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('save-failed')
      const saved = normalizeNote(await response.json() as AnotacaoApiResponse)
      setAnotacoes((current) => wasEditing
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current])
      setLoadStatus('success')
      setView('list')
      toast.success(wasEditing ? 'Anotação atualizada.' : 'Anotação criada.')
    } catch {
      toast.error('Erro ao salvar a anotação.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (nota: Anotacao) => {
    const accepted = await confirm({
      title: 'Excluir anotação',
      message: 'Esta anotação será removida permanentemente.',
      danger: true,
      confirmText: 'Excluir',
    })
    if (!accepted) return

    try {
      const response = await fetch(`/api/anotacoes/${nota.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete-failed')
      setAnotacoes((current) => current.filter((item) => item.id !== nota.id))
      toast.success('Anotação excluída.')
    } catch {
      toast.error('Não foi possível excluir a anotação.')
    }
  }

  if (view === 'editor') {
    return (
      <WorkspacePage size="compact" archetype="marginalia">
        <DetailHeader
          variant="quiet"
          index={editingNote ? 'Marginalia · revisão' : 'Marginalia · nova nota'}
          eyebrow={<><FilePenLine size={13} /> Escrita pessoal</>}
          title={editingNote ? 'Editar anotação' : 'Nova anotação'}
          description="Registre a ideia enquanto ela está viva. Você poderá reencontrá-la por título, conteúdo ou tags."
          icon={PenTool}
          actions={
            <Button type="button" variant="ghost" size="sm" onClick={() => setView('list')}>
              <ArrowLeft size={15} /> Voltar ao acervo
            </Button>
          }
        />

        <form onSubmit={handleSave} className="marginalia-editor space-y-5">
          <section className="form-section form-section--accent space-y-5">
            <SectionHeading icon={AlignLeft} title="Conteúdo da anotação" description="Use um título curto e um texto que preserve o contexto da ideia." />
            <Input
              label="Título"
              value={formTitulo}
              onChange={(event) => setFormTitulo(event.target.value)}
              maxLength={180}
              required
              placeholder="Ex.: A fidelidade de Deus no deserto"
              autoFocus
            />
            <Textarea
              label="Conteúdo"
              value={formConteudo}
              onChange={(event) => setFormConteudo(event.target.value)}
              rows={14}
              required
              maxLength={20000}
              placeholder="Escreva o insight, contexto, referências e próximos passos…"
              className="min-h-72 font-serif text-base leading-8"
              hint={`${formConteudo.length.toLocaleString('pt-BR')}/20.000 caracteres`}
            />
            <Input
              label="Tags"
              value={formTags}
              onChange={(event) => setFormTags(event.target.value)}
              icon={<Tag size={15} />}
              placeholder="oração, graça, romanos"
              hint="Separe as tags por vírgulas."
            />
          </section>

          <fieldset className="form-section">
            <legend className="px-2 text-sm font-medium text-foreground">
              <span className="flex items-center gap-2"><Palette size={16} className="text-primary" /> Tom visual</span>
            </legend>
            <p className="mb-4 text-xs leading-relaxed text-subtle">A cor ajuda a reconhecer grupos de ideias sem competir com o conteúdo.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COLOR_OPTIONS.map((color) => {
                const tone = NOTE_TONES[color]
                return (
                  <label key={color} className="cursor-pointer">
                    <input type="radio" name="note-tone" value={color} checked={formCor === color} onChange={() => setFormCor(color)} className="peer sr-only" />
                    <span className="flex h-11 items-center gap-2.5 rounded-xl border border-hairline bg-elevated/45 px-3 text-xs font-medium text-muted-foreground transition-all hover:border-hairline-strong peer-checked:border-primary/35 peer-checked:bg-primary-soft peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      <span className={cn('h-3 w-3 rounded-full', tone.dot)} /> {tone.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <EditorActionBar status={editingNote ? 'As alterações serão aplicadas à anotação existente.' : 'A nova anotação será privada desta conta.'}>
            <Button type="button" variant="ghost" onClick={() => setView('list')} className="flex-1 sm:flex-none">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1 sm:flex-none"><Save size={16} /> {editingNote ? 'Salvar alterações' : 'Criar anotação'}</Button>
          </EditorActionBar>
        </form>
      </WorkspacePage>
    )
  }

  return (
    <WorkspacePage size="full" archetype="marginalia">
      <PageHeader
        variant="quiet"
        index="Caderno de margem · ideias pessoais"
        eyebrow={<><PenTool size={13} /> Marginalia</>}
        title={<>Ideias que merecem <span className="text-gradient">permanecer à margem.</span></>}
        description="Capture insights, organize temas e transforme pensamentos breves em estudos, aulas e mensagens."
        action={<Button onClick={openNew}><Plus size={16} /> Nova anotação</Button>}
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{anotacoes.length} {anotacoes.length === 1 ? 'anotação' : 'anotações'}</Badge>
            <Badge variant="default"><Pin size={12} /> {anotacoes.filter((item) => item.fixada).length} fixadas</Badge>
            <Badge variant="outline"><Tag size={12} /> {Math.max(0, allTags.length - 1)} tags</Badge>
          </div>
        }
      />

      <div className="marginalia-toolbar">
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Buscar anotações"
            placeholder="Buscar por título ou conteúdo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto scrollbar-hide" aria-label="Filtrar por tag">
          {allTags.map((tagName) => (
            <button
              key={tagName}
              type="button"
              aria-pressed={activeTag === tagName}
              onClick={() => setActiveTag(tagName)}
              className={cn(
                'h-9 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors',
                activeTag === tagName
                  ? 'border-primary/35 bg-primary-soft text-primary-hover'
                  : 'border-transparent text-subtle hover:bg-elevated hover:text-foreground',
              )}
            >
              {tagName}
            </button>
          ))}
        </div>
      </div>

      {loadStatus === 'loading' && (
        <div role="status" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Carregando anotações…</span>
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="skeleton h-64 rounded-2xl" />)}
        </div>
      )}

      {loadStatus === 'error' && (
        <EmptyState
          icon={PenTool}
          eyebrow="Acervo indisponível"
          title="Não foi possível carregar suas anotações."
          description="Tente novamente para sincronizar o caderno desta conta."
          action={<Button onClick={() => { setLoadStatus('loading'); void refreshNotes().catch(() => setLoadStatus('error')) }}>Tentar novamente</Button>}
        />
      )}

      {loadStatus === 'success' && filtered.length === 0 && (
        <EmptyState
          icon={PenTool}
          eyebrow={anotacoes.length === 0 ? 'Caderno vazio' : 'Nenhuma correspondência'}
          title={anotacoes.length === 0 ? 'Sua próxima grande ideia começa aqui.' : 'Nenhuma anotação encontrada.'}
          description={anotacoes.length === 0 ? 'Crie uma anotação para guardar insights, aplicações e referências.' : 'Ajuste a busca ou selecione outra tag.'}
          action={anotacoes.length === 0 ? <Button onClick={openNew}><Plus size={16} /> Criar primeira anotação</Button> : undefined}
        />
      )}

      {loadStatus === 'success' && filtered.length > 0 && (
        <div className="space-y-10">
          {pinned.length > 0 && (
            <NotesSection title="Fixadas" icon={Pin} notes={pinned} reduceMotion={Boolean(reduceMotion)} onPin={togglePin} onEdit={openEdit} onDelete={handleDelete} />
          )}
          {unpinned.length > 0 && (
            <NotesSection title="Recentes" icon={AlignLeft} notes={unpinned} reduceMotion={Boolean(reduceMotion)} onPin={togglePin} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      )}
    </WorkspacePage>
  )
}

function NotesSection({
  title,
  icon: Icon,
  notes,
  reduceMotion,
  onPin,
  onEdit,
  onDelete,
}: {
  title: string
  icon: typeof Pin
  notes: Anotacao[]
  reduceMotion: boolean
  onPin: (note: Anotacao) => void
  onEdit: (note: Anotacao) => void
  onDelete: (note: Anotacao) => void
}) {
  return (
    <section aria-labelledby={`notes-${title.toLocaleLowerCase('pt-BR')}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={`notes-${title.toLocaleLowerCase('pt-BR')}`} className="flex items-center gap-2 text-lg font-semibold text-foreground"><Icon size={17} className="text-primary" /> {title}</h2>
        <Badge variant="outline">{notes.length}</Badge>
      </div>
      <motion.div
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.055 } } }}
        className="marginalia-grid"
      >
        {notes.map((note) => {
          const tone = NOTE_TONES[normalizeColor(note.cor)]
          return (
            <motion.article
              key={note.id}
              data-tone={normalizeColor(note.cor)}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className={cn('marginalia-note group', tone.shell)}
            >
              <span aria-hidden="true" className={cn('absolute inset-x-6 top-0 h-px opacity-80', tone.line)} />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">{note.titulo}</h3>
                  <p className="mt-2 text-[11px] text-subtle">{new Date(note.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPin(note)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-background/25 text-subtle transition-colors hover:bg-elevated hover:text-foreground"
                  aria-label={note.fixada ? `Desafixar ${note.titulo}` : `Fixar ${note.titulo}`}
                  title={note.fixada ? 'Desafixar' : 'Fixar'}
                >
                  {note.fixada ? <Pin size={15} className="text-primary" /> : <PinOff size={15} />}
                </button>
              </div>

              <p className="mt-5 line-clamp-6 flex-1 whitespace-pre-line text-sm leading-7 text-muted-foreground">{note.conteudo}</p>

              {note.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {note.tags.map((tagName) => <Badge key={tagName} variant="outline"><Tag size={10} /> {tagName}</Badge>)}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-1 border-t border-hairline pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(note)} aria-label={`Editar ${note.titulo}`}>
                  <Edit2 size={14} /> Editar
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(note)} aria-label={`Excluir ${note.titulo}`} className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={14} />
                </Button>
              </div>
            </motion.article>
          )
        })}
      </motion.div>
    </section>
  )
}
