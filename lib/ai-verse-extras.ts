import 'server-only'

import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai'
import { getLivro } from '@/data/livros'
import { db } from '@/lib/firebase'

// Gera (via IA) o texto original (hebraico/aramaico ou grego, sem tradução) e a
// King James Version (KJV) de um versículo, para complementar a comparação de
// versões. O resultado é cacheado no Firestore (coleção `verseExtras`) para não
// regenerar a cada abertura — economiza chamadas de IA e deixa instantâneo depois.

const schema = z.object({
  originalText: z.string(),
  kjvText: z.string(),
})

export interface VerseExtras {
  originalText: string
  kjvText: string
}

function docIdFor(ref: string): string {
  return ref
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
}

/** Escapa delimitadores para o texto de referência não quebrar o bloco de dados. */
function safe(value: string, maxLength: number): string {
  return value.slice(0, maxLength).replaceAll('<', '‹').replaceAll('>', '›')
}

export async function getVerseExtras(ref: string, ptText: string): Promise<VerseExtras | null> {
  const docRef = db.collection('verseExtras').doc(docIdFor(ref))

  // 1) Cache
  try {
    const snap = await docRef.get()
    if (snap.exists) {
      const data = snap.data()
      if (data && typeof data.originalText === 'string' && typeof data.kjvText === 'string') {
        return { originalText: data.originalText, kjvText: data.kjvText }
      }
    }
  } catch {
    // Falha de leitura do cache: segue para geração.
  }

  // 2) Idioma original pelo testamento do livro
  const bookMatch = ref.trim().match(/^(.+?)\s+\d+/)
  const livro = bookMatch ? getLivro(bookMatch[1].trim()) : undefined
  const testament = livro?.testamento ?? 'NT'
  const originalInstruction =
    testament === 'AT'
      ? 'o texto hebraico do Texto Massorético (ou aramaico, quando o versículo original for aramaico — ex.: partes de Daniel e Esdras), no script hebraico original'
      : 'o texto grego koiné do Novo Testamento, no script grego original'

  // 3) Geração
  try {
    const { object } = await generateObject({
      model: getModel(),
      maxOutputTokens: 1024,
      schema,
      prompt: `Para o versículo bíblico "${safe(ref, 100)}", forneça DOIS campos:

1. originalText: ${originalInstruction}, EXATAMENTE como no texto original, SEM tradução e SEM transliteração (apenas o script original).
2. kjvText: o texto EXATO da King James Version (KJV) em inglês.

Referência em português (apenas para desambiguar de qual versículo se trata): <ref>${safe(ptText, 500)}</ref>

REGRAS: Nunca invente. Reproduza os textos com fidelidade. Se você não tiver certeza do texto exato para algum dos campos, retorne string vazia ("") naquele campo em vez de adivinhar. Não inclua comentários, referências nem formatação — apenas os textos.`,
    })

    const result: VerseExtras = {
      originalText: object.originalText.trim(),
      kjvText: object.kjvText.trim(),
    }

    // 4) Cache (best-effort — não bloqueia nem lança)
    void docRef
      .set({ ...result, ref, testament, createdAt: new Date().toISOString() })
      .catch(() => undefined)

    return result
  } catch (error) {
    console.error('[VerseExtras] Falha ao gerar original/KJV:', error)
    return null
  }
}
