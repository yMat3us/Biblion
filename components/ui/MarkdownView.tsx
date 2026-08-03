'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renderização de Markdown (com GFM). Isolado num módulo próprio para ser
 * carregado sob demanda via next/dynamic (ver components/ui/Markdown.tsx) — assim
 * react-markdown + remark-gfm (micromark, pesado) ficam fora do bundle inicial.
 * Os chamadores já envolvem o conteúdo em um contêiner `.prose`.
 */
export default function MarkdownView({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
}
