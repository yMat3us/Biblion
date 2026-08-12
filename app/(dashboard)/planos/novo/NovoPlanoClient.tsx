'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Lock, PlusCircle, Save, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

// Mensagens rotativas do carregamento. Em escopo de módulo (constante estável),
// para não virar dependência reativa do efeito nem ser recriada a cada render.
const mensagensCarregamento = [
  'Iniciando Inteligência Artificial...',
  'Buscando referências bíblicas...',
  'Lendo o contexto histórico...',
  'Escrevendo reflexões pastorais...',
  'Gerando perguntas e ações...',
  'Revisando teologia do plano...',
  'Finalizando os dias...',
]

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
  const [motivo, setMotivo] = useState('')
  const [visibility, setVisibility] = useState<Visibilidade>('PRIVATE')
  const [gerando, setGerando] = useState(false)

  const isLongo = dias > 60
  const disabled = tema.trim().length < 3 || (isLongo && motivo.trim().length < 5)

  async function gerar() {
    if (gerando || disabled) return
    setGerando(true)
    setLoadingMsgIdx(0)
    try {
      const response = await fetch('/api/ai/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: tema.trim(), dias, visibility, motivo: isLongo ? motivo.trim() : undefined }),
      })
      if (!response.ok) {
        toast.error(await mensagemErro(response, 'Não foi possível gerar o plano.'))
        return
      }
      const data = (await response.json()) as { planId: string; jaExistia: boolean; status?: string }
      if (data.status === 'PENDING_APPROVAL') {
        toast.success('Plano enviado para aprovação devido ao longo período.')
      } else {
        toast.success(data.jaExistia ? 'Você já tinha um plano parecido — abrindo ele.' : 'Plano gerado com oração e cuidado.')
      }
      router.push(`/planos/${data.planId}`)
    } catch {
      toast.error('Falha de conexão ao gerar o plano.')
    } finally {
      setGerando(false)
    }
  }

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  // Rotaciona as mensagens enquanto gera. O reset do índice acontece no início
  // da geração (em `gerar`), fora do efeito — evita setState síncrono aqui.
  useEffect(() => {
    if (!gerando) return
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i < mensagensCarregamento.length - 1 ? i + 1 : i))
    }, 4500)
    return () => clearInterval(interval)
  }, [gerando])

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
          max={365}
          value={dias}
          onChange={(event) => setDias(Math.max(1, Math.min(365, Number(event.target.value) || 1)))}
        />
        <VisibilidadeToggle valor={visibility} onChange={setVisibility} />
      </div>
      
      {isLongo && (
        <Textarea 
          label="Motivo para plano longo (> 60 dias)"
          placeholder="Por que deseja gerar um plano tão longo? Isso passará por aprovação do administrador."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={1000}
          className="min-h-20 border-warning"
        />
      )}

      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-elevated/40 p-3.5 text-xs leading-relaxed text-subtle">
        <Sparkles size={16} className="shrink-0 text-primary" />
        A IA sugere referências bíblicas para você abrir e ler na própria Bíblia. Sempre confira as passagens. Planos grandes ({'>'} 60 dias) dependem de aprovação.
      </div>
      <Button onClick={gerar} loading={gerando} disabled={disabled} className="w-full sm:w-auto transition-all duration-300">
        {gerando ? <span className="animate-pulse">{mensagensCarregamento[loadingMsgIdx]}</span> : <><Wand2 size={16} /> Gerar plano</>}
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
  const [motivo, setMotivo] = useState('')

  const isLongo = dias.length > 60
  const diasValidos = dias.filter((dia) => dia.referencia.trim() && dia.reflexao.trim())
  const podeSalvar = titulo.trim().length > 0 && diasValidos.length > 0 && (!isLongo || motivo.trim().length >= 5)

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
          motivo: isLongo ? motivo.trim() : undefined,
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
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setDias((atual) => [...atual, diaVazio()])} disabled={dias.length >= 365}>
          <PlusCircle size={15} /> Adicionar dia
        </Button>
        {dias.length >= 365 && <p className="mt-2 text-xs text-warning">Você atingiu o limite de 365 dias (1 ano).</p>}
        {isLongo && (
          <div className="mt-6">
            <Textarea 
              label="Motivo para plano longo (> 60 dias)"
              placeholder="Por que deseja criar um plano tão longo? Isso passará por aprovação do administrador."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={1000}
              className="min-h-20 border-warning"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
        <Button onClick={salvar} loading={salvando} disabled={!podeSalvar}>
          <Save size={16} /> Salvar plano
        </Button>
      </div>
    </div>
  )
}
