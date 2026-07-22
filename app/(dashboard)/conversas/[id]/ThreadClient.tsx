'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'

interface ChatUser {
  id: string
  publicId: string | null
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface Mensagem {
  id: string
  corpo: string | null
  minha: boolean
  removida: boolean
  createdAt: string
}

const POLL_MS = 4000

export function ThreadClient({
  conversaId,
  outro,
  mensagensIniciais,
}: {
  conversaId: string
  outro: ChatUser | null
  mensagensIniciais: Mensagem[]
}) {
  const toast = useToast()
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)

  const idsRef = useRef<Set<string>>(new Set(mensagensIniciais.map((m) => m.id)))
  const cursorRef = useRef<string>(mensagensIniciais.at(-1)?.createdAt ?? new Date(0).toISOString())
  const fimRef = useRef<HTMLDivElement>(null)
  const nome = outro?.displayName || outro?.username || 'Conversa'

  const marcarLida = useCallback(() => {
    void fetch(`/api/conversas/${conversaId}/ler`, { method: 'POST' }).catch(() => undefined)
  }, [conversaId])

  const adicionar = useCallback((novas: Mensagem[]) => {
    const filtradas = novas.filter((m) => !idsRef.current.has(m.id))
    if (filtradas.length === 0) return
    for (const m of filtradas) {
      idsRef.current.add(m.id)
      if (m.createdAt > cursorRef.current) cursorRef.current = m.createdAt
    }
    setMensagens((prev) => [...prev, ...filtradas])
  }, [])

  useEffect(() => {
    marcarLida()
    const intervalo = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversas/${conversaId}?since=${encodeURIComponent(cursorRef.current)}`)
        if (!response.ok) return
        const data = (await response.json()) as { mensagens: Mensagem[] }
        if (data.mensagens?.length) {
          adicionar(data.mensagens)
          marcarLida()
        }
      } catch {
        // silencioso: tentativa seguinte do polling tenta de novo
      }
    }, POLL_MS)
    return () => clearInterval(intervalo)
  }, [conversaId, adicionar, marcarLida])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar(event?: React.FormEvent) {
    event?.preventDefault()
    const corpo = input.trim()
    if (!corpo || enviando) return
    setEnviando(true)
    try {
      const response = await fetch(`/api/conversas/${conversaId}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpo }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
        toast.error(body?.error?.message ?? 'Não foi possível enviar a mensagem.')
        return
      }
      adicionar([(await response.json()) as Mensagem])
      setInput('')
    } catch {
      toast.error('Falha de conexão ao enviar.')
    } finally {
      setEnviando(false)
    }
  }

  async function apagar(id: string) {
    try {
      const response = await fetch(`/api/conversas/${conversaId}/mensagens/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete-failed')
      setMensagens((prev) => prev.map((m) => (m.id === id ? { ...m, removida: true, corpo: null } : m)))
    } catch {
      toast.error('Não foi possível apagar a mensagem.')
    }
  }

  return (
    <div className="chat-shell flex h-[calc(100dvh-4.25rem-env(safe-area-inset-top))] flex-col">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
        <Link href="/conversas" className="flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-elevated hover:text-foreground" aria-label="Voltar às conversas">
          <ChevronLeft size={18} />
        </Link>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft bg-cover bg-center text-sm font-semibold text-primary"
          style={outro?.avatarUrl ? { backgroundImage: `url(${JSON.stringify(outro.avatarUrl)})` } : undefined}
        >
          {!outro?.avatarUrl && nome.charAt(0).toLocaleUpperCase('pt-BR')}
        </span>
        <div className="min-w-0 flex-1">
          {outro?.publicId ? (
            <Link href={`/u/${outro.publicId}`} className="block truncate font-semibold text-foreground hover:underline">{nome}</Link>
          ) : (
            <span className="block truncate font-semibold text-foreground">{nome}</span>
          )}
          <span className="block truncate text-xs text-subtle">Conversa privada</span>
        </div>
      </header>

      <div className="chat-transcript custom-scrollbar flex-1 overflow-y-auto px-4 py-5" role="log" aria-live="polite">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {mensagens.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga olá com graça.</p>
          )}
          {mensagens.map((mensagem) => (
            <div key={mensagem.id} className={cn('group flex', mensagem.minha ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'relative max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  mensagem.minha ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm border border-hairline bg-surface text-foreground',
                )}
              >
                {mensagem.removida ? (
                  <span className="italic opacity-70">mensagem removida</span>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{mensagem.corpo}</span>
                )}
                <span className={cn('mt-1 block text-[10px]', mensagem.minha ? 'text-primary-foreground/70' : 'text-subtle')}>
                  {new Date(mensagem.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {mensagem.minha && !mensagem.removida && (
                  <button
                    type="button"
                    onClick={() => apagar(mensagem.id)}
                    aria-label="Apagar mensagem"
                    className="absolute -left-9 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={fimRef} aria-hidden="true" />
        </div>
      </div>

      <div className="chat-composer px-3 pt-3">
        <form onSubmit={enviar} className="mx-auto flex max-w-2xl items-end gap-2 pb-1">
        <label htmlFor="mensagem" className="sr-only">Mensagem</label>
        <textarea
          id="mensagem"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void enviar()
            }
          }}
          placeholder="Escreva com respeito e edificação…"
          rows={1}
          maxLength={4000}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-hairline-strong bg-background/50 px-3.5 py-2.5 text-sm leading-6 text-foreground placeholder:text-subtle focus:border-primary/55 focus:outline-none focus:ring-2 focus:ring-primary/15 custom-scrollbar"
        />
        <Button type="submit" size="icon" loading={enviando} disabled={!input.trim()} aria-label="Enviar">
          {!enviando && <Send size={17} />}
        </Button>
        </form>
      </div>
    </div>
  )
}
