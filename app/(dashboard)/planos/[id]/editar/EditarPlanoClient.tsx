'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Lock, PlusCircle, Save, Trash2 } from 'lucide-react'
import { DetailHeader, SectionHeading, WorkspacePage } from '@/components/layout/WorkspacePage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

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

export function EditarPlanoClient({ plano }: { plano: Record<string, unknown> & { id: string, source: string, titulo: string, descricao: string, categoria: string, visibility: string, dias: Record<string, unknown>[] } }) {
  const router = useRouter()
  const toast = useToast()
  
  const isAI = plano.source === 'AI'

  const [titulo, setTitulo] = useState(plano.titulo || '')
  const [descricao, setDescricao] = useState(plano.descricao || '')
  const [categoria, setCategoria] = useState(plano.categoria || '')
  const [visibility, setVisibility] = useState<Visibilidade>(plano.visibility as Visibilidade)
  const [dias, setDias] = useState<DiaRascunho[]>(
    plano.dias.map((d: { titulo?: string, referencia?: string, reflexao?: string, pergunta?: string, acao?: string, oracao?: string }) => ({
      titulo: d.titulo || '',
      referencia: d.referencia || '',
      reflexao: d.reflexao || '',
      pergunta: d.pergunta || '',
      acao: d.acao || '',
      oracao: d.oracao || ''
    }))
  )
  const [salvando, setSalvando] = useState(false)

  const diasValidos = dias.filter((dia) => dia.referencia.trim() && dia.reflexao.trim())
  const podeSalvar = isAI ? true : (titulo.trim().length > 0 && diasValidos.length > 0)

  function atualizarDia(index: number, patch: Partial<DiaRascunho>) {
    setDias((atual) => atual.map((dia, i) => (i === index ? { ...dia, ...patch } : dia)))
  }

  async function salvar() {
    if (salvando || !podeSalvar) return
    setSalvando(true)
    try {
      const response = await fetch(`/api/planos/${plano.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: isAI ? undefined : titulo.trim(),
          descricao: isAI ? undefined : (descricao.trim() || null),
          categoria: isAI ? undefined : (categoria.trim() || null),
          visibility,
          dias: isAI ? undefined : diasValidos.map((dia, index) => ({
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
        toast.error(await mensagemErro(response, 'Não foi possível salvar as edições.'))
        return
      }
      toast.success('Plano atualizado.')
      router.push(`/planos/${plano.id}`)
      router.refresh()
    } catch {
      toast.error('Falha de conexão ao atualizar o plano.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <WorkspacePage archetype="library" size="compact">
      <DetailHeader
        variant="administration"
        backHref={`/planos/${plano.id}`}
        backLabel="Voltar"
        eyebrow="Edição"
        title={`Editar: ${plano.titulo}`}
        description={isAI ? "Planos gerados por IA só podem ter sua visibilidade alterada." : "Edite as informações e dias do seu plano manual."}
      />

      <div className="space-y-6">
        <div className="surface space-y-4 p-5 sm:p-6">
          {!isAI && (
            <>
              <Input label="Título do plano" placeholder="Ex.: 7 dias em Filipenses" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
              <Textarea label="Descrição (opcional)" placeholder="Uma frase que convide à leitura." value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} className="min-h-20" />
            </>
          )}
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isAI && (
              <Input label="Categoria (opcional)" placeholder="Ex.: Devocional" value={categoria} onChange={(e) => setCategoria(e.target.value)} maxLength={80} />
            )}
            <VisibilidadeToggle valor={visibility} onChange={setVisibility} />
          </div>
        </div>

        {!isAI && (
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
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setDias((atual) => [...atual, diaVazio()])} disabled={dias.length >= 60}>
              <PlusCircle size={15} /> Adicionar dia
            </Button>
            {dias.length >= 60 && <p className="mt-2 text-xs text-warning">Você atingiu o limite manual de 60 dias (2 meses).</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
          <Button onClick={salvar} loading={salvando} disabled={!podeSalvar}>
            <Save size={16} /> Salvar plano
          </Button>
        </div>
      </div>
    </WorkspacePage>
  )
}
