'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  Check,
  Copy,
  GraduationCap,
  ImageIcon,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  Square,
  User,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

function getMessageText(message: UIMessage): string {
  return message.parts.map((part) => part.type === 'text' ? part.text : '').join('')
}

function getMessageImageParts(message: UIMessage): FileUIPart[] {
  return message.parts.filter(
    (part): part is FileUIPart => part.type === 'file' && part.mediaType.startsWith('image'),
  )
}

function MessageCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-subtle transition-colors hover:bg-elevated hover:text-foreground"
      aria-label={copied ? 'Mensagem copiada' : 'Copiar mensagem'}
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

const SUGGESTIONS = [
  {
    title: 'Estudo exegético',
    prompt: 'Faça uma análise exegética de Romanos 8:1, incluindo contexto histórico e termos importantes do grego.',
    icon: BookOpen,
    eyebrow: 'Texto e contexto',
  },
  {
    title: 'Apologética pastoral',
    prompt: 'Como explicar e defender a confiabilidade das Escrituras com clareza, respeito e base histórica?',
    icon: Shield,
    eyebrow: 'Razão e mansidão',
  },
  {
    title: 'Esboço de mensagem',
    prompt: 'Crie um esboço expositivo de Lucas 15 sobre a graça do Pai, com introdução, três movimentos e aplicação.',
    icon: Sparkles,
    eyebrow: 'Da passagem ao púlpito',
  },
  {
    title: 'Dúvida doutrinária',
    prompt: 'Explique a diferença entre justificação e santificação com base nas epístolas paulinas.',
    icon: GraduationCap,
    eyebrow: 'Teologia sistemática',
  },
]

export default function TutorPage() {
  const reduceMotion = useReducedMotion()
  const {
    messages,
    status,
    sendMessage,
    error,
    setMessages,
    stop,
    regenerate,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ai/tutor' }),
    onError: (chatError) => console.error('[TUTOR_CHAT_ERROR]', chatError),
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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, isLoading, error, reduceMotion])

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    if ((!inputValue.trim() && (!selectedFiles || selectedFiles.length === 0)) || isLoading) return

    clearError()
    if (selectedFiles?.length) sendMessage({ text: inputValue.trim(), files: selectedFiles })
    else sendMessage({ text: inputValue.trim() })
    setInputValue('')
    setSelectedFiles(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const transfer = new DataTransfer()
    if (selectedFiles) Array.from(selectedFiles).forEach((file) => transfer.items.add(file))
    Array.from(files).forEach((file) => transfer.items.add(file))
    setSelectedFiles(transfer.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    if (!selectedFiles) return
    const transfer = new DataTransfer()
    Array.from(selectedFiles).forEach((file, fileIndex) => {
      if (fileIndex !== index) transfer.items.add(file)
    })
    setSelectedFiles(transfer.files.length ? transfer.files : null)
  }

  return (
    <div data-archetype="cabinet" className="chat-shell tutor-cabinet h-[calc(100dvh-4.25rem-env(safe-area-inset-top))]">
      <header className="tutor-header">
        <span className="tutor-header__seal">
          <GraduationCap size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">Tutor Teológico</h1>
            <Badge variant="default" className="hidden sm:inline-flex">IA contextual</Badge>
          </div>
          <p className="truncate text-xs text-subtle">Exegese, doutrina, apologética e homilética</p>
        </div>
        <Badge variant={isLoading ? 'default' : 'success'}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isLoading ? 'animate-pulse bg-primary-hover' : 'bg-success')} />
          {isLoading ? 'Pensando' : 'Disponível'}
        </Badge>
      </header>

      <div
        className="chat-transcript custom-scrollbar"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversa com o Tutor Teológico"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <AnimatePresence mode="wait" initial={false}>
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="tutor-welcome"
              >
                <div className="tutor-welcome__seal">
                  <GraduationCap size={33} />
                  <span aria-hidden="true" />
                </div>
                <p className="index-label mb-3 text-primary-hover">Gabinete de diálogo · sessão 01</p>
                <h2>
                  Traga a pergunta. Vamos buscar <span className="text-gradient">clareza.</span>
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Pergunte sobre uma passagem, doutrina ou aplicação. Você também pode anexar imagens para contextualizar o estudo.
                </p>

                <div className="tutor-prompts">
                  {SUGGESTIONS.map(({ title, prompt, icon: Icon, eyebrow }, index) => (
                    <button
                      key={title}
                      type="button"
                      disabled={isLoading}
                      onClick={() => sendMessage({ text: prompt })}
                      className="tutor-prompt group"
                    >
                      <span className="tutor-prompt__number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="tutor-prompt__icon"><Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="index-label text-primary-hover">{eyebrow}</span>
                        <span className="mt-1.5 block text-sm font-semibold text-foreground">{title}</span>
                        <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{prompt}</span>
                      </span>
                      <span aria-hidden="true" className="tutor-prompt__arrow">↗</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="conversation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
                {messages.map((message) => {
                  const messageText = getMessageText(message)
                  const imageParts = getMessageImageParts(message)
                  const fromUser = message.role === 'user'
                  return (
                    <motion.article
                      key={message.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      data-role={fromUser ? 'user' : 'assistant'}
                      className={cn('tutor-message flex gap-3 sm:gap-4', fromUser && 'flex-row-reverse')}
                    >
                      <span className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10',
                        fromUser ? 'border-primary/30 bg-primary text-white' : 'border-hairline bg-surface text-primary',
                      )}>
                        {fromUser ? <User size={17} /> : <GraduationCap size={18} />}
                      </span>
                      <div className={cn('min-w-0 max-w-[calc(100%-3rem)] sm:max-w-[88%]', fromUser ? 'ml-auto' : 'flex-1')}>
                        <p className="sr-only">{fromUser ? 'Você disse:' : 'O Tutor respondeu:'}</p>
                        <div className={cn(
                          'rounded-2xl border p-4 shadow-soft sm:p-5',
                          fromUser
                            ? 'rounded-tr-md border-primary/25 bg-primary-soft text-foreground'
                            : 'rounded-tl-md border-hairline bg-surface text-foreground/90',
                        )}>
                          {fromUser ? (
                            <div className="space-y-3">
                              {messageText && <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">{messageText}</p>}
                              {imageParts.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {imageParts.map((part, index) => (
                                    <Image
                                      key={`${message.id}-image-${index}`}
                                      src={part.url}
                                      alt={`Imagem anexada ${index + 1}`}
                                      width={320}
                                      height={240}
                                      unoptimized
                                      className="max-h-64 w-auto max-w-full rounded-xl border border-hairline object-cover"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : messageText ? (
                            <div className="prose max-w-none text-sm sm:text-[15px]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText}</ReactMarkdown>
                            </div>
                          ) : (
                            <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                              <span className="ml-1">Construindo resposta…</span>
                            </div>
                          )}
                        </div>
                        {!fromUser && messageText && <div className="mt-1 flex justify-start"><MessageCopyButton text={messageText} /></div>}
                      </div>
                    </motion.article>
                  )
                })}

                {status === 'submitted' && messages.at(-1)?.role === 'user' && (
                  <div role="status" className="flex gap-3 sm:gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface text-primary"><GraduationCap size={17} /></span>
                    <div className="rounded-2xl rounded-tl-md border border-hairline bg-surface px-5 py-4 text-sm text-muted-foreground shadow-soft">Analisando contexto e referências…</div>
                  </div>
                )}

                {error && (
                  <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 sm:flex sm:items-center sm:gap-4">
                    <p className="flex-1 text-sm leading-6 text-destructive">A resposta foi interrompida. Verifique sua conexão e tente gerar novamente.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { clearError(); void regenerate() }}
                      className="mt-3 w-full sm:mt-0 sm:w-auto"
                    >
                      <RotateCcw size={14} /> Tentar novamente
                    </Button>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="chat-composer px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto max-w-4xl">
          {selectedFiles?.length ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Imagens selecionadas">
              {Array.from(selectedFiles).map((file, index) => (
                <div key={`${file.name}-${file.lastModified}`} className="flex max-w-52 shrink-0 items-center gap-2 rounded-xl border border-hairline bg-elevated px-2.5 py-2 text-xs text-muted-foreground">
                  <ImageIcon size={14} className="shrink-0 text-primary" />
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(index)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-destructive/10 hover:text-destructive" aria-label={`Remover ${file.name}`}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl border border-hairline-strong bg-surface p-2 shadow-raised transition-colors focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15">
            <input ref={fileInputRef} type="file" className="sr-only" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-45"
              aria-label="Anexar imagens"
              title="Anexar imagens"
            >
              <ImageIcon size={19} />
            </button>

            <label htmlFor="tutor-message" className="sr-only">Mensagem para o Tutor Teológico</label>
            <textarea
              id="tutor-message"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Pergunte sobre um texto, doutrina ou aplicação…"
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-foreground placeholder:text-subtle focus:outline-none custom-scrollbar sm:text-[15px]"
              rows={1}
              disabled={isLoading}
            />

            {isLoading ? (
              <button type="button" onClick={() => stop()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hairline-strong bg-elevated text-foreground transition-colors hover:bg-overlay" aria-label="Interromper resposta">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim() && !selectedFiles?.length}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            )}
          </form>
          <p className="mt-2 text-center text-[10px] leading-4 text-subtle sm:text-xs">Use Shift + Enter para uma nova linha. Revise informações importantes nas fontes bíblicas.</p>
        </div>
      </div>
    </div>
  )
}
