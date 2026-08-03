'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Lock, PlusCircle, Save, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

type Modo = 'ia' | 'manual'
type Visibilidade = 'PRIVATE' | 'PUBLIC'

interface DiaRascunho {
  titulo: string
  referencia: string
  reflexao: string
  pergunta: string
  acao: string
  oracao: string
}

function diaVazio(): DiaRascunho {
  return { titulo: '', referencia: '', reflexao: '', pergunta: '', acao: '', oracao: '' }
}

async function mensagemErro(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? fallback
}

export function NovoPlanoClient() {
  const router = useRouter()
  const toast = useToast()
  const [modo, setModo] = useState<Modo>('ia')

  return (
    <WorkspacePage archetype="library" size="compact">
      <DetailHeader
        variant="administration"
        backHref="/planos"
        backLabel="Planos"
        eyebrow="Novo plano de leitura"
        title="Criar um plano"
        description="Gere um roteiro com auxílio de IA ou monte o seu, dia a dia, com versículo, reflexão, pergunta, ação e oração."
      />

      <div className="mb-6 flex gap-1.5">
        <ModoTab active={modo === 'ia'} onClick={() => setModo('ia')} icon={Wand2}>Gerar com IA</ModoTab>
        <ModoTab active={modo === 'manual'} onClick={() => setModo('manual')} icon={PlusCircle}>Criar manualmente</ModoTab>
      </div>

      {modo === 'ia' ? <FormularioIA router={router} toast={toast} /> : <FormularioManual router={router} toast={toast} />}
    </WorkspacePage>
  )
}

function ModoTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Wand2; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
        active ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong bg-background/40 text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon size={15} /> {children}
    </button>
  )
}

function VisibilidadeToggle({ valor, onChange }: { valor: Visibilidade; onChange: (v: Visibilidade) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="ml-0.5 text-sm font-medium text-muted-foreground">Visibilidade</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('PRIVATE')}
          aria-pressed={valor === 'PRIVATE'}
          className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            valor === 'PRIVATE' ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong text-muted-foreground hover:text-foreground')}
        >
          <Lock size={14} /> Privado
        </button>
        <button
          type="button"
          onClick={() => onChange('PUBLIC')}
          aria-pressed={valor === 'PUBLIC'}
          className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
            valor === 'PUBLIC' ? 'border-primary/40 bg-primary-soft text-primary' : 'border-hairline-strong text-muted-foreground hover:text-foreground')}
        >
          <Globe size={14} /> Público
        </button>
      </div>
      <p className="ml-0.5 text-xs text-subtle">
        {valor === 'PUBLIC' ? 'Aparecerá no catálogo e no seu perfil.' : 'Só você verá este plano.'}
      </p>
    </div>
  )
}

type FormProps = { router: ReturnType<typeof useRouter>; toast: ReturnType<typeof useToast> }

function FormularioIA({ router, toast }: FormProps) {
  const [tema, setTema] = useState('')
  const [dias, setDias] = useState(7)
  const [visibility, setVisibility] = useState<Visibilidade>('PRIVATE')
  const [gerando, setGerando] = useState(false)

  async function gerar() {
    if (gerando || tema.trim().length < 3) return
    setGerando(true)
    try {
      const response = await fetch('/api/ai/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: tema.trim(), dias, visibility }),
      })
      if (!response.ok) {
        toast.error(await mensagemErro(response, 'Não foi possível gerar o plano.'))
        return
      }
      const data = (await response.json()) as { planId: string; jaExistia: boolean }
      toast.success(data.jaExistia ? 'Você já tinha um plano parecido — abrindo ele.' : 'Plano gerado com oração e cuidado.')
      router.push(`/planos/${data.planId}`)
    } catch {
      toast.error('Falha de conexão ao gerar o plano.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="surface space-y-5 p-5 sm:p-6">
      <Input
        label="Sobre o que é o plano?"
        placeholder="Ex.: A oração na vida de Jesus"
        value={tema}
        onChange={(event) => setTema(event.target.value)}
        maxLength={300}
        icon={<Sparkles size={16} />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Quantos dias?"
          type="number"
          min={1}
          max={30}
          value={dias}
          onChange={(event) => setDias(Math.max(1, Math.min(30, Number(event.target.value) || 1)))}
        />
        <VisibilidadeToggle valor={visibility} onChange={setVisibility} />
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-elevated/40 p-3.5 text-xs leading-relaxed text-subtle">
        <Sparkles size={16} className="shrink-0 text-primary" />
        A IA sugere referências bíblicas para você abrir e ler na própria Bíblia. Sempre confira as passagens.
      </div>
      <Button onClick={gerar} loading={gerando} disabled={tema.trim().length < 3} className="w-full sm:w-auto">
        <Wand2 size={16} /> Gerar plano
      </Button>
    </div>
  )
}

function FormularioManual({ router, toast }: FormProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [visibility, setVisibility] = useState<Visibilidade>('PRIVATE')
  const [dias, setDias] = useState<DiaRascunho[]>([diaVazio()])
  const [salvando, setSalvando] = useState(false)

  const diasValidos = dias.filter((dia) => dia.referencia.trim() && dia.reflexao.trim())
  const podeSalvar = titulo.trim().length > 0 && diasValidos.length > 0

  function atualizarDia(index: number, patch: Partial<DiaRascunho>) {
    setDias((atual) => atual.map((dia, i) => (i === index ? { ...dia, ...patch } : dia)))
  }

  async function salvar() {
    if (salvando || !podeSalvar) return
    setSalvando(true)
    try {
      const response = await fetch('/api/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          categoria: categoria.trim() || null,
          visibility,
          dias: diasValidos.map((dia, index) => ({
            dia: index + 1,
            titulo: dia.titulo.trim() || null,
            referencia: dia.referencia.trim(),
            reflexao: dia.reflexao.trim(),
            pergunta: dia.pergunta.trim() || null,
            acao: dia.acao.trim() || null,
            oracao: dia.oracao.trim() || null,
          })),
        }),
      })
      if (!response.ok) {
        toast.error(await mensagemErro(response, 'Não foi possível salvar o plano.'))
        return
      }
      const data = (await response.json()) as { id: string }
      toast.success('Plano criado.')
      router.push(`/planos/${data.id}`)
    } catch {
      toast.error('Falha de conexão ao salvar o plano.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface space-y-4 p-5 sm:p-6">
        <Input label="Título do plano" placeholder="Ex.: 7 dias em Filipenses" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
        <Textarea label="Descrição (opcional)" placeholder="Uma frase que convide à leitura." value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} className="min-h-20" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Categoria (opcional)" placeholder="Ex.: Devocional" value={categoria} onChange={(e) => setCategoria(e.target.value)} maxLength={80} />
          <VisibilidadeToggle valor={visibility} onChange={setVisibility} />
        </div>
      </div>

      <div>
        <SectionHeading title="Dias do plano" description="Cada dia guia uma leitura, reflexão e oração." />
        <div className="space-y-4">
          {dias.map((dia, index) => (
            <div key={index} className="surface space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Dia {index + 1}</span>
                {dias.length > 1 && (
                  <button type="button" onClick={() => setDias((atual) => atual.filter((_, i) => i !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-destructive/10 hover:text-destructive" aria-label={`Remover dia ${index + 1}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input placeholder="Título (opcional)" value={dia.titulo} onChange={(e) => atualizarDia(index, { titulo: e.target.value })} maxLength={200} />
                <Input placeholder="Referência — ex.: Salmo 1" value={dia.referencia} onChange={(e) => atualizarDia(index, { referencia: e.target.value })} maxLength={300} />
              </div>
              <Textarea placeholder="Reflexão do dia" value={dia.reflexao} onChange={(e) => atualizarDia(index, { reflexao: e.target.value })} maxLength={8000} className="min-h-24" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Textarea placeholder="Pergunta pessoal (opcional)" value={dia.pergunta} onChange={(e) => atualizarDia(index, { pergunta: e.target.value })} maxLength={2000} className="min-h-20" />
                <Textarea placeholder="Ação prática (opcional)" value={dia.acao} onChange={(e) => atualizarDia(index, { acao: e.target.value })} maxLength={2000} className="min-h-20" />
              </div>
              <Textarea placeholder="Oração guiada (opcional)" value={dia.oracao} onChange={(e) => atualizarDia(index, { oracao: e.target.value })} maxLength={4000} className="min-h-20" />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setDias((atual) => [...atual, diaVazio()])}>
          <PlusCircle size={15} /> Adicionar dia
        </Button>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
        <Button onClick={salvar} loading={salvando} disabled={!podeSalvar}>
          <Save size={16} /> Salvar plano
        </Button>
      </div>
    </div>
  )
}
