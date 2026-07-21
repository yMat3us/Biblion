'use client'

import type { LicaoEBD } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  Check,
  Copy,
  GraduationCap,
  ListChecks,
  MessageCircleQuestion,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Target,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type AssistenteLicao = Pick<LicaoEBD, 'id' | 'revistaId' | 'numero' | 'titulo' | 'textoBase'>

function getMessageText(message: UIMessage): string {
  return message.parts.map((part) => part.type === 'text' ? part.text : '').join('')
}

const SUGGESTIONS = [
  { icon: BookOpen, label: 'Explique o texto base', prompt: 'Explique o texto base desta lição considerando contexto bíblico, mensagem central e termos importantes.' },
  { icon: Target, label: 'Crie aplicações', prompt: 'Sugira aplicações práticas, fiéis ao conteúdo desta lição, para diferentes realidades dos alunos.' },
  { icon: MessageCircleQuestion, label: 'Gere perguntas', prompt: 'Crie perguntas progressivas para revisão, reflexão e debate em classe sobre esta lição.' },
  { icon: ListChecks, label: 'Monte um roteiro', prompt: 'Organize um roteiro de aula claro para esta lição, incluindo abertura, desenvolvimento, interação e conclusão.' },
]

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" onClick={handleCopy} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-subtle transition-colors hover:bg-elevated hover:text-foreground" aria-label={copied ? 'Resposta copiada' : 'Copiar resposta'}>
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}{copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export function EBDAssistenteClient({ licao }: { licao: AssistenteLicao }) {
  const reduceMotion = useReducedMotion()
  const {
    messages,
    status,
    sendMessage,
    setMessages,
    error,
    stop,
    regenerate,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({ api: `/api/ebd/${licao.id}/chat` }),
    onError: (chatError) => console.error('[EBD_CHAT_ERROR]', chatError),
    onFinish: ({ message }) => {
      if (!getMessageText(message).trim()) {
        const fallbackMessage: UIMessage = {
          id: `${message.id}-fallback`,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Não foi possível gerar uma resposta completa. Tente novamente.' }],
        }
        setMessages((current) => [...current, fallbackMessage])
      }
    },
  })
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'
  const cleanTitle = licao.titulo.replace(/^Lição\s*\d+[\s-:]*/i, '').trim()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, isLoading, error, reduceMotion])

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!inputValue.trim() || isLoading) return
    clearError()
    sendMessage({ text: inputValue.trim() })
    setInputValue('')
  }

  return (
    <div data-archetype="cabinet" className="chat-shell tutor-cabinet ebd-assistant h-[calc(100dvh-4.25rem-env(safe-area-inset-top))]">
      <header className="tutor-header">
        <Link href={`/ebd/${licao.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground" aria-label="Voltar à lição">
          <ArrowLeft size={18} />
        </Link>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary-soft text-primary shadow-glow sm:flex"><BrainCircuit size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="truncate text-sm font-semibold text-foreground sm:text-base">Assistente da Lição {licao.numero ?? ''}</h1><Badge variant="default" className="hidden md:inline-flex">Contexto privado</Badge></div>
          <p className="truncate text-xs text-subtle">{cleanTitle || licao.titulo}</p>
        </div>
        <Badge variant={isLoading ? 'default' : 'success'}><span className={cn('h-1.5 w-1.5 rounded-full', isLoading ? 'animate-pulse bg-primary-hover' : 'bg-success')} />{isLoading ? 'Pensando' : 'Pronto'}</Badge>
      </header>

      <div className="chat-transcript custom-scrollbar" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversa sobre a lição EBD">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tutor-welcome ebd-assistant-welcome">
              <div className="tutor-welcome__seal"><GraduationCap size={32} /><span aria-hidden="true" /></div>
              <p className="index-label mt-6 text-primary-hover">Gabinete da lição · contexto privado</p>
              <h2>Prepare uma aula que gere <span className="text-gradient">compreensão.</span></h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Este assistente usa o conteúdo processado da lição para explicar tópicos, propor aplicações e organizar a condução da classe.</p>
              {licao.textoBase && <Badge variant="warning" className="mt-4"><BookOpen size={11} /> {licao.textoBase}</Badge>}

              <div className="tutor-prompts">
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }, index) => (
                  <button key={label} type="button" disabled={isLoading} onClick={() => sendMessage({ text: prompt })} className="tutor-prompt group">
                    <span className="tutor-prompt__number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="tutor-prompt__icon"><Icon size={17} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{prompt}</span></span>
                    <span aria-hidden="true" className="tutor-prompt__arrow">↗</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-6">
              {messages.map((message) => {
                const textContent = getMessageText(message)
                const fromUser = message.role === 'user'
                return (
                  <motion.article key={message.id} data-role={fromUser ? 'user' : 'assistant'} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('tutor-message flex gap-3 sm:gap-4', fromUser && 'flex-row-reverse')}>
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10', fromUser ? 'border-primary/30 bg-primary text-white' : 'border-hairline bg-surface text-primary')}>{fromUser ? <User size={17} /> : <BrainCircuit size={18} />}</span>
                    <div className={cn('min-w-0 max-w-[calc(100%-3rem)] sm:max-w-[88%]', fromUser ? 'ml-auto' : 'flex-1')}>
                      <p className="sr-only">{fromUser ? 'Você perguntou:' : 'O assistente respondeu:'}</p>
                      <div className={cn('rounded-2xl border p-4 shadow-soft sm:p-5', fromUser ? 'rounded-tr-md border-primary/25 bg-primary-soft' : 'rounded-tl-md border-hairline bg-surface')}>
                        {textContent ? <div className="prose max-w-none text-sm sm:text-[15px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown></div> : <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles size={15} className="animate-pulse text-primary" /> Construindo resposta…</div>}
                      </div>
                      {!fromUser && textContent && <div className="mt-1"><CopyMessageButton text={textContent} /></div>}
                    </div>
                  </motion.article>
                )
              })}

              {status === 'submitted' && messages.at(-1)?.role === 'user' && (
                <div role="status" className="flex gap-3 sm:gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface text-primary"><BrainCircuit size={17} /></span><div className="rounded-2xl rounded-tl-md border border-hairline bg-surface px-5 py-4 text-sm text-muted-foreground shadow-soft">Consultando a estrutura da lição…</div></div>
              )}

              {error && (
                <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 sm:flex sm:items-center sm:gap-4">
                  <p className="flex-1 text-sm leading-6 text-destructive">A resposta foi interrompida. Tente gerar novamente sem perder a conversa.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => { clearError(); void regenerate() }} className="mt-3 w-full sm:mt-0 sm:w-auto"><RotateCcw size={14} /> Tentar novamente</Button>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      <div className="chat-composer px-3 pt-3 sm:px-6 sm:pt-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-hairline-strong bg-surface p-2 shadow-raised transition-colors focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15">
          <label htmlFor="ebd-assistant-message" className="sr-only">Pergunta sobre a lição</label>
          <textarea
            id="ebd-assistant-message"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit() } }}
            placeholder="Pergunte sobre a lição, aplicação ou condução da aula…"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-foreground placeholder:text-subtle focus:outline-none custom-scrollbar sm:text-[15px]"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button type="button" onClick={() => stop()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hairline-strong bg-elevated text-foreground transition-colors hover:bg-overlay" aria-label="Interromper resposta"><Square size={16} fill="currentColor" /></button>
          ) : (
            <button type="submit" disabled={!inputValue.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45" aria-label="Enviar pergunta"><Send size={18} /></button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-4xl text-center text-[10px] leading-4 text-subtle sm:text-xs">Use Shift + Enter para uma nova linha. Confira referências antes de ensinar.</p>
      </div>
    </div>
  )
}
