// Domain / UI types.
//
// Persistence types now come directly from Prisma (`import type { Sermao } from
// '@prisma/client'`), so the previous hand-written model interfaces — which had
// drifted from the schema (referencing a non-existent `userId`/`User`) — were
// removed to avoid confusion.

export interface Versiculo {
  livro: string
  capitulo: number
  versiculo: number
  texto: string
  abreviacao?: string
}

export interface Livro {
  nome: string
  abreviacao: string
  testamento: 'AT' | 'NT'
  capitulos: number
  categoria?: string
}

export interface Doutrina {
  id: string
  nome: string
  descricao: string
  icon: string
  color: string
  topicos: TopicoDoutrina[]
}

export interface TopicoDoutrina {
  titulo: string
  conteudo: string
  versiculos: string[]
}
