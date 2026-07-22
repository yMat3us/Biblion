'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Layers3,
  Lightbulb,
  Mic,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { DetailHeader, EditorActionBar, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IntelligentTextarea } from '@/components/ui/IntelligentTextarea'
import { Textarea } from '@/components/ui/Textarea'
import { VerseSelector } from '@/components/ui/VerseSelector'
import { useConfirm, useToast } from '@/components/ui/Feedback'

export interface SermonEditorInitial {
  id: string
  titulo: string
  tema?: string | null
  textoBase: string
  introducao?: string | null
  topicos?: string | null
  conclusao?: string | null
  aplicacao?: string | null
  categoria?: string | null
  publicado: boolean
}

interface Subtopic {
  titulo: string
  conteudo: string
  versiculos: string
}

interface Topic {
  titulo: string
  conteudo: string
  versiculos: string
  subtopicos?: Subtopic[]
}

interface AiSermonResponse {
  sermon: {
    introducao: string
    topicos: Topic[]
    conclusao: string
    aplicacao: string
  }
}

const CATEGORIES = [
  'Expositivo',
  'Temático',
  'Devocional',
  'Aula EBD',
  'Evangelístico',
  'Doutrinário',
  'Profético',
  'Pastoral',
  'Ensinamento',
  'Outro',
]

const THEME_SUGGESTIONS = [
  'A graça salvadora de Deus',
  'O poder da oração',
  'A fidelidade de Deus',
  'Vivendo pela fé',
  'O amor de Deus',
  'A segunda vinda de Cristo',
  'O novo nascimento',
  'Servindo a Deus e ao próximo',
]

const TEMPLATES: Array<{ name: string; description: string; topics: Topic[]; introduction: string }> = [
  {
    name: 'Expositivo',
    description: 'Caminhe pelo contexto, sentido e aplicação do texto.',
    introduction: 'Apresente o contexto da passagem, a tensão central e por que ela importa para os ouvintes.',
    topics: [
      { titulo: 'Contexto e intenção do autor', conteudo: '', versiculos: '' },
      { titulo: 'O sentido do texto', conteudo: '', versiculos: '' },
      { titulo: 'A resposta que o texto exige', conteudo: '', versiculos: '' },
    ],
  },
  {
    name: 'Temático',
    description: 'Construa uma linha bíblica clara ao redor de um tema.',
    introduction: 'Apresente o tema, sua relevância e a pergunta que conduzirá a mensagem.',
    topics: [
      { titulo: 'A necessidade revelada', conteudo: '', versiculos: '' },
      { titulo: 'A resposta das Escrituras', conteudo: '', versiculos: '' },
      { titulo: 'Implicações para a vida', conteudo: '', versiculos: '' },
    ],
  },
  {
    name: 'Devocional',
    description: 'Da contemplação do texto a uma resposta pessoal.',
    introduction: 'Convide a igreja a desacelerar e ouvir o que Deus comunica por meio desta passagem.',
    topics: [
      { titulo: 'O que o texto revela sobre Deus', conteudo: '', versiculos: '' },
      { titulo: 'O que o texto revela sobre nós', conteudo: '', versiculos: '' },
      { titulo: 'Como responder em fé', conteudo: '', versiculos: '' },
    ],
  },
  {
    name: 'Aula EBD',
    description: 'Objetivo, desenvolvimento e fixação do aprendizado.',
    introduction: 'Apresente o objetivo da aula e conecte o conteúdo à realidade da turma.',
    topics: [
      { titulo: 'Objetivo e fundamento bíblico', conteudo: '', versiculos: '' },
      { titulo: 'Desenvolvimento doutrinário', conteudo: '', versiculos: '' },
      { titulo: 'Aplicação e perguntas para debate', conteudo: '', versiculos: '' },
    ],
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSubtopics(value: unknown): Subtopic[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((subtopic) => {
    if (!isRecord(subtopic)) return []
    return [{
      titulo: typeof subtopic.titulo === 'string' ? subtopic.titulo : '',
      conteudo: typeof subtopic.conteudo === 'string' ? subtopic.conteudo : '',
      versiculos: typeof subtopic.versiculos === 'string' ? subtopic.versiculos : '',
    }]
  })
}

function parseTopics(raw?: string | null): Topic[] {
  if (!raw) return [{ titulo: '', conteudo: '', versiculos: '' }]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const topics = parsed.flatMap((topic) => {
        if (!isRecord(topic)) return []
        return [{
          titulo: typeof topic.titulo === 'string' ? topic.titulo : '',
          conteudo: typeof topic.conteudo === 'string' ? topic.conteudo : '',
          versiculos: typeof topic.versiculos === 'string' ? topic.versiculos : '',
          subtopicos: parseSubtopics(topic.subtopicos),
        }]
      })
      if (topics.length > 0) return topics
    }
  } catch {
    // Conteúdo inválido usa um tópico em branco para permitir recuperação manual.
  }
  return [{ titulo: '', conteudo: '', versiculos: '' }]
}

type SermonEditorProps =
  | { mode: 'create'; initialSermon?: never }
  | { mode: 'edit'; initialSermon: SermonEditorInitial }

export function SermonEditor(props: SermonEditorProps) {
  const { mode } = props
  const initialSermon = mode === 'edit' ? props.initialSermon : undefined
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [titulo, setTitulo] = useState(initialSermon?.titulo ?? '')
  const [tema, setTema] = useState(initialSermon?.tema ?? '')
  const [textoBase, setTextoBase] = useState(initialSermon?.textoBase ?? '')
  const [introducao, setIntroducao] = useState(initialSermon?.introducao ?? '')
  const [topicos, setTopicos] = useState<Topic[]>(() => parseTopics(initialSermon?.topicos))
  const [conclusao, setConclusao] = useState(initialSermon?.conclusao ?? '')
  const [aplicacao, setAplicacao] = useState(initialSermon?.aplicacao ?? '')
  const [categoria, setCategoria] = useState(initialSermon?.categoria ?? '')
  const [savingAs, setSavingAs] = useState<'draft' | 'published' | null>(null)
  const [aiTask, setAiTask] = useState<'full' | 'selection' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hasDraftContent = Boolean(
    introducao.trim()
    || conclusao.trim()
    || aplicacao.trim()
    || topicos.some((topic) => topic.titulo.trim() || topic.conteudo.trim()),
  )

  const updateTopic = (index: number, field: keyof Topic, value: string) => {
    setTopicos((current) => current.map((topic, topicIndex) => topicIndex === index ? { ...topic, [field]: value } : topic))
  }
  const addTopic = () => setTopicos((current) => [...current, { titulo: '', conteudo: '', versiculos: '' }])
  const removeTopic = (index: number) => setTopicos((current) => current.filter((_, topicIndex) => topicIndex !== index))
  const addSubtopic = (topicIndex: number) => {
    setTopicos((current) => current.map((topic, index) => index === topicIndex
      ? { ...topic, subtopicos: [...(topic.subtopicos ?? []), { titulo: '', conteudo: '', versiculos: '' }] }
      : topic))
  }
  const removeSubtopic = (topicIndex: number, subtopicIndex: number) => {
    setTopicos((current) => current.map((topic, index) => index === topicIndex
      ? { ...topic, subtopicos: topic.subtopicos?.filter((_, subIndex) => subIndex !== subtopicIndex) }
      : topic))
  }
  const updateSubtopic = (topicIndex: number, subtopicIndex: number, field: keyof Subtopic, value: string) => {
    setTopicos((current) => current.map((topic, index) => index === topicIndex
      ? { ...topic, subtopicos: topic.subtopicos?.map((subtopic, subIndex) => subIndex === subtopicIndex ? { ...subtopic, [field]: value } : subtopic) }
      : topic))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!titulo.trim()) nextErrors.titulo = 'O título é obrigatório.'
    if (!textoBase.trim()) nextErrors.textoBase = 'O texto base é obrigatório.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async (published: boolean) => {
    if (!validate() || savingAs) return
    setSavingAs(published ? 'published' : 'draft')
    try {
      const payload = {
        titulo: titulo.trim(),
        tema: tema.trim(),
        textoBase: textoBase.trim(),
        introducao,
        topicos: JSON.stringify(topicos),
        conclusao,
        aplicacao,
        categoria,
        publicado: published,
      }
      const response = await fetch(props.mode === 'edit' ? `/api/sermoes/${props.initialSermon.id}` : '/api/sermoes', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('sermon-save-failed')
      const body = mode === 'create' ? await response.json() as { id: string } : null
      const sermonId = initialSermon?.id ?? body?.id
      toast.success(mode === 'edit' ? 'Sermão atualizado.' : 'Sermão salvo.')
      router.push(`/sermoes/${sermonId}`)
      router.refresh()
    } catch {
      toast.error('Não foi possível salvar o sermão.')
    } finally {
      setSavingAs(null)
    }
  }

  const applyTemplate = async (template: (typeof TEMPLATES)[number]) => {
    if (hasDraftContent) {
      const accepted = await confirm({
        title: 'Aplicar novo modelo',
        message: 'O modelo substituirá a introdução e os tópicos atuais. Título, tema e texto base serão preservados.',
        confirmText: 'Aplicar modelo',
      })
      if (!accepted) return
    }
    setCategoria(template.name)
    setIntroducao(template.introduction)
    setTopicos(template.topics.map((topic) => ({ ...topic, versiculos: topic.versiculos || textoBase })))
  }

  const generateFullSermon = async () => {
    if (!textoBase.trim()) {
      setErrors((current) => ({ ...current, textoBase: 'Informe o texto base antes de gerar com IA.' }))
      toast.error('A IA precisa de um texto base para orientar a mensagem.')
      return
    }
    if (hasDraftContent) {
      const accepted = await confirm({
        title: 'Substituir conteúdo com IA',
        message: 'Introdução, tópicos, conclusão e aplicação atuais serão substituídos pela nova geração.',
        confirmText: 'Gerar novo conteúdo',
      })
      if (!accepted) return
    }

    setAiTask('full')
    try {
      const response = await fetch('/api/ai/sermon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema: tema.trim() || titulo.trim(),
          texto: textoBase.trim(),
          keyword: titulo.trim(),
          style: categoria || 'Expositivo',
        }),
      })
      if (!response.ok) throw new Error('sermon-ai-failed')
      const data: AiSermonResponse = await response.json()
      setIntroducao(data.sermon.introducao)
      setTopicos(data.sermon.topicos.length ? data.sermon.topicos : [{ titulo: '', conteudo: '', versiculos: '' }])
      setConclusao(data.sermon.conclusao)
      setAplicacao(data.sermon.aplicacao)
      toast.success('Estrutura gerada. Revise e personalize antes de publicar.')
    } catch {
      toast.error('Não foi possível gerar o sermão com IA.')
    } finally {
      setAiTask(null)
    }
  }

  const handleAiAction = async (
    action: string,
    selectedText: string,
    setter: (value: string) => void,
    currentValue: string,
  ) => {
    if (aiTask) return
    setAiTask('selection')
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Ação solicitada: ${action}. Trabalhe o trecho a seguir e retorne apenas o resultado final, sem prefácio: "${selectedText}"` }],
        }),
      })
      if (!response.ok || !response.body) throw new Error('selection-ai-failed')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
      }
      result += decoder.decode()
      const cleanResult = result.trim()
      if (!cleanResult) throw new Error('empty-ai-result')
      setter(`${currentValue.trimEnd()}${currentValue.trim() ? '\n\n' : ''}${cleanResult}`)
      toast.success('Sugestão adicionada ao campo. Revise o resultado.')
    } catch {
      toast.error('Não foi possível aplicar a assistência ao trecho.')
    } finally {
      setAiTask(null)
    }
  }

  const backHref = mode === 'edit' && initialSermon ? `/sermoes/${initialSermon.id}` : '/sermoes'

  return (
    <WorkspacePage size="full" archetype="manuscript">
      <DetailHeader
        variant="manuscript"
        index={mode === 'edit' ? 'Manuscrito · revisão editorial' : 'Manuscrito · nova composição'}
        backHref={backHref}
        backLabel={mode === 'edit' ? 'Voltar ao sermão' : 'Biblioteca de sermões'}
        eyebrow={<><Mic size={13} /> Oficina homilética</>}
        title={mode === 'edit' ? 'Editar sermão' : 'Novo sermão'}
        description="Construa a mensagem em camadas: fundamento bíblico, movimento do texto, desenvolvimento e resposta prática."
        icon={Mic}
        meta={
          <>
            <Badge variant={initialSermon?.publicado ? 'success' : 'outline'}>{initialSermon?.publicado ? 'Publicado' : 'Rascunho'}</Badge>
            <Badge variant="warning"><BookOpen size={11} /> Escritura no centro</Badge>
          </>
        }
      />

      <form className="sermon-editor" onSubmit={(event) => { event.preventDefault(); void handleSave(false) }}>
        <div className="editor-grid">
          <div className="space-y-5">
            <section className="form-section form-section--accent space-y-5">
              <SectionHeading icon={BookOpen} title="Fundamento da mensagem" description="Defina o que será comunicado, para quem e a partir de qual passagem." />
              <Input
                label="Título do sermão"
                placeholder="Ex.: A graça que nos encontra no caminho"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                error={errors.titulo}
                required
                maxLength={300}
                autoFocus
              />
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Input
                    label="Tema"
                    placeholder="Ex.: Graça, restauração, discipulado"
                    value={tema}
                    onChange={(event) => setTema(event.target.value)}
                    list="sermon-theme-suggestions"
                    maxLength={300}
                    icon={<Lightbulb size={16} />}
                  />
                  <datalist id="sermon-theme-suggestions">{THEME_SUGGESTIONS.map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
                </div>
                <VerseSelector
                  label="Texto base"
                  placeholder="Selecione a passagem principal"
                  value={textoBase}
                  onChange={(value) => { setTextoBase(value); setErrors((current) => ({ ...current, textoBase: '' })) }}
                  error={errors.textoBase}
                />
              </div>
              <label className="block max-w-md">
                <span className="field-label mb-1.5 block">Categoria</span>
                <select value={categoria} onChange={(event) => setCategoria(event.target.value)} className="select-field">
                  <option value="">Sem categoria</option>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </section>

            <section className="form-section">
              <SectionHeading icon={FileText} title="Introdução" description="Crie tensão, contexto e uma ponte clara para o movimento do texto." />
              <IntelligentTextarea
                label="Abertura da mensagem"
                placeholder="Apresente o contexto, a necessidade dos ouvintes e a pergunta central…"
                value={introducao}
                onChange={(event) => setIntroducao(event.target.value)}
                maxLength={20000}
                className="min-h-40"
                hint="Selecione um trecho para explicar, melhorar ou gerar aplicação com IA."
                onAiAction={(action, text) => handleAiAction(action, text, setIntroducao, introducao)}
              />
            </section>

            <section className="form-section">
              <SectionHeading
                icon={Layers3}
                title="Desenvolvimento"
                description={`${topicos.length} ${topicos.length === 1 ? 'movimento principal' : 'movimentos principais'} na estrutura.`}
                action={<Button type="button" variant="outline" size="sm" onClick={addTopic}><Plus size={14} /> Adicionar tópico</Button>}
              />

              <div className="space-y-4">
                {topicos.map((topic, topicIndex) => (
                  <article key={topicIndex} className="manuscript-movement">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-glow">{topicIndex + 1}</span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">Tópico {topicIndex + 1}</p><p className="text-[11px] text-subtle">Movimento principal da mensagem</p></div>
                      {topicos.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTopic(topicIndex)} aria-label={`Remover tópico ${topicIndex + 1}`} className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Input label="Título do tópico" placeholder="Uma afirmação clara e memorável" value={topic.titulo} onChange={(event) => updateTopic(topicIndex, 'titulo', event.target.value)} maxLength={300} />
                      <IntelligentTextarea
                        label="Desenvolvimento do tópico"
                        placeholder="Explique o texto, conecte a verdade e conduza à aplicação…"
                        value={topic.conteudo}
                        onChange={(event) => updateTopic(topicIndex, 'conteudo', event.target.value)}
                        maxLength={20000}
                        className="min-h-36"
                        onAiAction={(action, text) => handleAiAction(action, text, (value) => updateTopic(topicIndex, 'conteudo', value), topic.conteudo)}
                      />
                      <VerseSelector label="Referência de apoio" placeholder="Adicionar passagem relacionada" value={topic.versiculos} onChange={(value) => updateTopic(topicIndex, 'versiculos', value)} />

                      <div className="border-t border-hairline pt-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div><p className="text-sm font-medium text-foreground">Subtópicos</p><p className="text-xs text-subtle">Detalhes, argumentos ou aplicações internas.</p></div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => addSubtopic(topicIndex)}><Plus size={13} /> Adicionar</Button>
                        </div>
                        <div className="space-y-3">
                          {topic.subtopicos?.map((subtopic, subtopicIndex) => (
                            <div key={subtopicIndex} className="manuscript-submovement">
                              <div className="mb-3 flex items-center gap-2">
                                <Badge variant="outline">{topicIndex + 1}.{subtopicIndex + 1}</Badge>
                                <span className="text-xs text-subtle">Subtópico</span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSubtopic(topicIndex, subtopicIndex)} aria-label={`Remover subtópico ${topicIndex + 1}.${subtopicIndex + 1}`} className="ml-auto h-8 w-8 hover:bg-destructive/10 hover:text-destructive"><Trash2 size={13} /></Button>
                              </div>
                              <div className="space-y-3">
                                <Input label="Título" value={subtopic.titulo} onChange={(event) => updateSubtopic(topicIndex, subtopicIndex, 'titulo', event.target.value)} maxLength={300} />
                                <IntelligentTextarea
                                  label="Conteúdo"
                                  value={subtopic.conteudo}
                                  onChange={(event) => updateSubtopic(topicIndex, subtopicIndex, 'conteudo', event.target.value)}
                                  maxLength={20000}
                                  className="min-h-28"
                                  onAiAction={(action, text) => handleAiAction(action, text, (value) => updateSubtopic(topicIndex, subtopicIndex, 'conteudo', value), subtopic.conteudo)}
                                />
                                <VerseSelector label="Referência de apoio" value={subtopic.versiculos} onChange={(value) => updateSubtopic(topicIndex, subtopicIndex, 'versiculos', value)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="form-section grid gap-5 xl:grid-cols-2">
              <div>
                <SectionHeading icon={CheckCircle2} title="Conclusão" description="Retome a verdade central e conduza a uma decisão." />
                <Textarea aria-label="Conteúdo da conclusão" value={conclusao} onChange={(event) => setConclusao(event.target.value)} maxLength={20000} rows={7} placeholder="Sintetize os movimentos e apresente o chamado final…" />
              </div>
              <div>
                <SectionHeading icon={Target} title="Aplicação prática" description="Mostre como a verdade encontra a vida cotidiana." />
                <Textarea aria-label="Conteúdo da aplicação prática" value={aplicacao} onChange={(event) => setAplicacao(event.target.value)} maxLength={20000} rows={7} placeholder="Quais atitudes, crenças ou prioridades devem mudar?" />
              </div>
            </section>
          </div>

          <aside className="manuscript-editor-index space-y-5 xl:sticky xl:top-6">
            <section className="form-section form-section--accent">
              <SectionHeading icon={BrainCircuit} title="Copiloto homilético" description="Use a IA como ponto de partida, nunca como versão final." />
              <Button type="button" loading={aiTask === 'full'} disabled={Boolean(aiTask)} onClick={generateFullSermon} className="w-full">
                <Sparkles size={16} /> Gerar estrutura completa
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-subtle">Requer texto base. Conteúdo existente só é substituído após confirmação.</p>
            </section>

            <section className="form-section">
              <SectionHeading icon={Layers3} title="Modelos de estrutura" description="Escolha um fluxo e adapte ao texto." />
              <div className="space-y-2">
                {TEMPLATES.map((template) => (
                  <button key={template.name} type="button" onClick={() => void applyTemplate(template)} className="group w-full rounded-xl border border-hairline bg-background/25 p-3 text-left transition-colors hover:border-primary/25 hover:bg-primary-soft">
                    <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-foreground">{template.name}</span><Plus size={14} className="text-subtle group-hover:text-primary" /></span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{template.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="form-section">
              <p className="eyebrow mb-4">Checklist editorial</p>
              <ul className="space-y-3 text-xs leading-5 text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" /> O texto base orienta cada movimento?</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" /> Os tópicos formam uma progressão clara?</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" /> A aplicação nasce da passagem?</li>
              </ul>
            </section>
          </aside>
        </div>

        <EditorActionBar status={savingAs ? 'Salvando seu sermão com segurança…' : aiTask === 'selection' ? 'O assistente está trabalhando no trecho selecionado…' : 'Revise o conteúdo gerado antes de publicar.'}>
          <Link href={backHref} className={buttonStyles({ variant: 'ghost', className: 'flex-1 sm:flex-none' })}>Cancelar</Link>
          <Button type="submit" variant="outline" loading={savingAs === 'draft'} disabled={Boolean(savingAs)} className="flex-1 sm:flex-none"><Save size={16} /> Salvar rascunho</Button>
          <Button type="button" loading={savingAs === 'published'} disabled={Boolean(savingAs)} onClick={() => handleSave(true)} className="flex-1 sm:flex-none"><BookOpen size={16} /> {initialSermon?.publicado ? 'Atualizar publicado' : 'Publicar sermão'}</Button>
        </EditorActionBar>
      </form>
    </WorkspacePage>
  )
}
