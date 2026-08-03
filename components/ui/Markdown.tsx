'use client'

import dynamic from 'next/dynamic'

/**
 * Markdown com carregamento tardio. react-markdown + remark-gfm são pesados
 * (micromark) e só aparecem em algumas páginas; carregá-los sob demanda
 * (ssr:false, exige contexto de client) mantém o bundle inicial dessas páginas
 * enxuto. A API é a mesma: `<Markdown>{texto}</Markdown>`.
 */
export const Markdown = dynamic(() => import('@/components/ui/MarkdownView'), {
  ssr: false,
  loading: () => <span className="text-subtle">…</span>,
})
