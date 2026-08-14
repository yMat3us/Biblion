/**
 * Bateria final — cenários 10 (dados determinísticos prevalecem) e 11
 * (referências), exercitando o VALIDADOR DETERMINÍSTICO REAL (sem mocks), que lê
 * Versions/ACF.json do filesystem. Confirma que a camada determinística é a fonte
 * de verdade: a IA não consegue aprovar Strong/referências inválidos.
 */
import { describe, it, expect } from 'vitest'
import { runDeterministicValidation } from '@/lib/ai-validators'
import type { VerseAnalysisResult } from '@/lib/ai-audit-types'

const longText = (label: string, n: number) => `${label}. `.repeat(n)

/** Análise NT coerente (João 1:1), aprovável pelo validador. */
function baseAnalysis(overrides: Partial<VerseAnalysisResult> = {}): VerseAnalysisResult {
  return {
    reference: 'João 1:1',
    verseText: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
    testament: 'NT',
    auditStatus: 'NEEDS_REVIEW',
    wordAnalysis: [
      { strongCode: 'G3056', originalWord: 'λόγος', transliteration: 'logos', meaning: 'palavra, verbo', contextAnalysis: 'Sujeito.' },
      { strongCode: 'G2316', originalWord: 'θεός', transliteration: 'theos', meaning: 'Deus', contextAnalysis: 'Predicativo.' },
    ],
    exegese: longText('Exegese detalhada e acadêmica do versículo em análise', 40),
    hermeneutica: longText('Análise hermenêutica cuidadosa do versículo', 30),
    contextoHistoricoCultural: longText('Contexto histórico-cultural pertinente', 20),
    contextoLiterario: longText('Contexto literário e estrutura', 20),
    teologia: longText('Teologia do texto em camadas', 20),
    referenciasCruzadas: [
      { referencia: 'João 1:14', tipo: 'paralelo', descricao: 'O Verbo se fez carne.' },
      { referencia: 'João 3:16', tipo: 'paralelo', descricao: 'Amor de Deus.' },
      { referencia: 'Romanos 1:1', tipo: 'alusao', descricao: 'Evangelho de Deus.' },
    ],
    ...overrides,
  }
}

describe('Validador determinístico real (cenários 10 e 11)', () => {
  it('aprova análise coerente com referências e Strong válidos (usa Versions/ACF.json)', async () => {
    const res = await runDeterministicValidation(baseAnalysis())
    expect(res.approved).toBe(true)
  })

  it('11a. livro inexistente → REF_BOOK_INVALID (não aprovado)', async () => {
    const res = await runDeterministicValidation(
      baseAnalysis({
        referenciasCruzadas: [
          { referencia: 'Livrofalso 1:1', tipo: 'paralelo', descricao: 'x' },
          { referencia: 'João 1:14', tipo: 'paralelo', descricao: 'y' },
          { referencia: 'João 3:16', tipo: 'paralelo', descricao: 'z' },
        ],
      }),
    )
    expect(res.approved).toBe(false)
    expect(res.issues.some((i) => i.type === 'REF_BOOK_INVALID')).toBe(true)
  })

  it('11b. versículo inexistente (overflow) → REF_VERSE_OVERFLOW', async () => {
    const res = await runDeterministicValidation(
      baseAnalysis({
        referenciasCruzadas: [
          { referencia: 'João 1:999', tipo: 'paralelo', descricao: 'x' },
          { referencia: 'João 1:14', tipo: 'paralelo', descricao: 'y' },
          { referencia: 'João 3:16', tipo: 'paralelo', descricao: 'z' },
        ],
      }),
    )
    expect(res.approved).toBe(false)
    expect(res.issues.some((i) => i.type === 'REF_VERSE_OVERFLOW')).toBe(true)
  })

  it('11c. capítulo inexistente → REF_CHAPTER_OVERFLOW', async () => {
    const res = await runDeterministicValidation(
      baseAnalysis({
        referenciasCruzadas: [
          { referencia: 'João 999:1', tipo: 'paralelo', descricao: 'x' },
          { referencia: 'João 1:14', tipo: 'paralelo', descricao: 'y' },
          { referencia: 'João 3:16', tipo: 'paralelo', descricao: 'z' },
        ],
      }),
    )
    expect(res.approved).toBe(false)
    expect(res.issues.some((i) => i.type === 'REF_CHAPTER_OVERFLOW')).toBe(true)
  })

  it('10a. dado determinístico prevalece: Strong grego no AT → STRONG_TESTAMENT_MISMATCH', async () => {
    const at = baseAnalysis({
      testament: 'AT',
      reference: 'Gênesis 1:1',
      verseText: 'No princípio criou Deus os céus e a terra.',
      wordAnalysis: [
        { strongCode: 'G3056', originalWord: 'λόγος', transliteration: 'logos', meaning: 'x', contextAnalysis: 'y' },
        { strongCode: 'H430', originalWord: 'אֱלֹהִים', transliteration: 'elohim', meaning: 'Deus', contextAnalysis: 'z' },
      ],
      referenciasCruzadas: [
        { referencia: 'Gênesis 1:2', tipo: 'paralelo', descricao: 'x' },
        { referencia: 'Gênesis 1:3', tipo: 'paralelo', descricao: 'y' },
        { referencia: 'Gênesis 2:4', tipo: 'paralelo', descricao: 'z' },
      ],
    })
    const res = await runDeterministicValidation(at)
    expect(res.approved).toBe(false)
    expect(res.issues.some((i) => i.type === 'STRONG_TESTAMENT_MISMATCH')).toBe(true)
  })

  it('10b. Strong com formato inválido → STRONG_INVALID (a IA não consegue aprovar dado inválido)', async () => {
    const res = await runDeterministicValidation(
      baseAnalysis({
        wordAnalysis: [
          { strongCode: 'X999', originalWord: 'λόγος', transliteration: 'logos', meaning: 'x', contextAnalysis: 'y' },
          { strongCode: 'G2316', originalWord: 'θεός', transliteration: 'theos', meaning: 'Deus', contextAnalysis: 'z' },
        ],
      }),
    )
    expect(res.approved).toBe(false)
    expect(res.issues.some((i) => i.type === 'STRONG_INVALID')).toBe(true)
  })
})
