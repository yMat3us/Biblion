/* eslint-disable @typescript-eslint/no-explicit-any -- Mocks do AI SDK e do
   validador usam any para simular payloads dinâmicos nos testes. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as aiSdk from 'ai'
import type { VerseAnalysisResult } from '@/lib/ai-audit-types'

// generateObject (chamada de IA da revisão) é mockado; getModel() roda de verdade.
vi.mock('ai', async (importOriginal) => {
  const mod = await importOriginal<typeof import('ai')>()
  return { ...mod, generateObject: vi.fn() }
})

// runDeterministicValidation é mockado para isolar a ORQUESTRAÇÃO da revisão do
// I/O do validador (leitura de FS / matching de livros). O validador real tem
// seus próprios testes; aqui controlamos aprovado/reprovado.
vi.mock('@/lib/ai-validators', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/ai-validators')>()
  return { ...mod, runDeterministicValidation: vi.fn() }
})

import { applyReviewCorrections, runReviewPass } from '@/lib/ai-verse-analysis'
import { runDeterministicValidation } from '@/lib/ai-validators'
import {
  decideAnalysisMode,
  extractStoredDraft,
  isStaleGenerating,
} from '@/lib/verse-analysis-cache'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Corrections = Parameters<typeof applyReviewCorrections>[1]

/** Cria uma correção (patch) preenchendo os campos não usados com null. */
function corr(op: string, fields: Record<string, unknown> = {}): any {
  return { op, section: null, index: null, text: null, word: null, crossRef: null, reasonCode: 'TEST', ...fields }
}

const longText = (label: string, n: number) => `${label}. `.repeat(n)

/** Draft NT completo e coerente (o suficiente para os testes de orquestração). */
function makeDraft(overrides: Partial<VerseAnalysisResult> = {}): VerseAnalysisResult {
  return {
    reference: 'João 1:1',
    verseText: 'No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus.',
    testament: 'NT',
    auditStatus: 'NEEDS_REVIEW',
    wordAnalysis: [
      { strongCode: 'G3056', originalWord: 'λόγος', transliteration: 'logos', meaning: 'palavra, verbo', contextAnalysis: 'Sujeito da oração.' },
      { strongCode: 'G2316', originalWord: 'θεός', transliteration: 'theos', meaning: 'Deus', contextAnalysis: 'Predicativo anartro.' },
    ],
    exegese: longText('Exegese detalhada do versículo', 40),
    hermeneutica: longText('Análise hermenêutica', 30),
    contextoHistoricoCultural: longText('Contexto histórico', 20),
    contextoLiterario: longText('Contexto literário', 20),
    teologia: longText('Teologia do texto', 20),
    referenciasCruzadas: [
      { referencia: 'João 1:14', tipo: 'paralelo', descricao: 'O Verbo se fez carne.' },
      { referencia: 'Gênesis 1:1', tipo: 'alusao', descricao: 'No princípio.' },
      { referencia: 'Colossenses 1:16', tipo: 'paralelo', descricao: 'Tudo foi criado por ele.' },
    ],
    ...overrides,
  }
}

const mockGenerateObject = aiSdk.generateObject as unknown as ReturnType<typeof vi.fn>
const mockValidate = runDeterministicValidation as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AI_PROVIDER = 'gemini'
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
})

// ---------------------------------------------------------------------------
// applyReviewCorrections — aplicação determinística de patches (pura)
// ---------------------------------------------------------------------------

describe('applyReviewCorrections', () => {
  it('sem correções: devolve uma cópia idêntica ao draft (não muta o original)', () => {
    const draft = makeDraft()
    const res = applyReviewCorrections(draft, [] as Corrections)
    expect(res.ok).toBe(true)
    expect(res.result).toEqual(draft)
    expect(res.result).not.toBe(draft)
  })

  it('setSection reescreve apenas a seção indicada', () => {
    const draft = makeDraft()
    const novaHermeneutica = longText('Hermenêutica corrigida', 30)
    const res = applyReviewCorrections(draft, [corr('setSection', { section: 'hermeneutica', text: novaHermeneutica })] as Corrections)
    expect(res.ok).toBe(true)
    expect(res.result!.hermeneutica).toBe(novaHermeneutica)
    expect(res.result!.exegese).toBe(draft.exegese)
  })

  it('replaceWord/addWord/removeWord manipulam wordAnalysis corretamente', () => {
    const draft = makeDraft()
    const res = applyReviewCorrections(draft, [
      corr('replaceWord', { index: 0, word: { strongCode: 'G3056', originalWord: 'λόγος', transliteration: 'logos', meaning: 'palavra (corrigido)', contextAnalysis: 'x' } }),
      corr('addWord', { word: { strongCode: 'G4314', originalWord: 'πρός', transliteration: 'pros', meaning: 'com', contextAnalysis: 'y' } }),
      corr('removeWord', { index: 1 }),
    ] as Corrections)
    expect(res.ok).toBe(true)
    const words = res.result!.wordAnalysis
    expect(words).toHaveLength(2) // 2 - 1 removida + 1 adicionada
    expect(words[0].meaning).toBe('palavra (corrigido)')
    expect(words.some((w) => w.transliteration === 'pros')).toBe(true)
    expect(words.some((w) => w.transliteration === 'theos')).toBe(false)
  })

  it('replace/add/removeCrossReference manipulam referenciasCruzadas', () => {
    const draft = makeDraft()
    const res = applyReviewCorrections(draft, [
      corr('replaceCrossReference', { index: 0, crossRef: { referencia: 'João 1:14', tipo: 'tipologia', descricao: 'corrigido' } }),
      corr('removeCrossReference', { index: 1 }),
      corr('addCrossReference', { crossRef: { referencia: 'Hebreus 1:2', tipo: 'paralelo', descricao: 'novo' } }),
    ] as Corrections)
    expect(res.ok).toBe(true)
    const refs = res.result!.referenciasCruzadas
    expect(refs).toHaveLength(3)
    expect(refs[0].tipo).toBe('tipologia')
    expect(refs.some((r) => r.referencia === 'Gênesis 1:1')).toBe(false)
    expect(refs.some((r) => r.referencia === 'Hebreus 1:2')).toBe(true)
  })

  it('preserva os campos protegidos (reference/verseText/testament)', () => {
    const draft = makeDraft()
    const res = applyReviewCorrections(draft, [corr('setSection', { section: 'exegese', text: longText('nova exegese', 40) })] as Corrections)
    expect(res.result!.reference).toBe(draft.reference)
    expect(res.result!.verseText).toBe(draft.verseText)
    expect(res.result!.testament).toBe(draft.testament)
  })

  it('rejeita índice fora do intervalo (patch inválido) sem mutar o draft', () => {
    const draft = makeDraft()
    const snapshot = JSON.parse(JSON.stringify(draft))
    const res = applyReviewCorrections(draft, [corr('replaceWord', { index: 999, word: { strongCode: 'G1', originalWord: 'a', transliteration: 'a', meaning: 'a', contextAnalysis: 'a' } })] as Corrections)
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/fora do intervalo/i)
    expect(draft).toEqual(snapshot)
  })

  it('rejeita payload ausente e seção inválida', () => {
    const draft = makeDraft()
    expect(applyReviewCorrections(draft, [corr('replaceWord', { index: 0, word: null })] as Corrections).ok).toBe(false)
    expect(applyReviewCorrections(draft, [corr('setSection', { section: null, text: 'x' })] as Corrections).ok).toBe(false)
  })

  it('rejeita quando as referências cruzadas excedem o máximo (20) após adições', () => {
    const draft = makeDraft()
    const adds = Array.from({ length: 20 }, (_, i) => corr('addCrossReference', { crossRef: { referencia: `João 1:${i + 2}`, tipo: 'paralelo', descricao: 'x' } }))
    const res = applyReviewCorrections(draft, adds as Corrections)
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/máximo/i)
  })

  it('análise longa: patches funcionam sem reproduzir o conteúdo extenso não alterado', () => {
    const draft = makeDraft({ exegese: longText('conteúdo muito extenso', 4000) })
    expect(draft.exegese.length).toBeGreaterThan(50_000)
    const res = applyReviewCorrections(draft, [corr('setSection', { section: 'teologia', text: longText('teologia nova', 30) })] as Corrections)
    expect(res.ok).toBe(true)
    expect(res.result!.exegese.length).toBe(draft.exegese.length) // intacta
    expect(res.result!.teologia).toContain('teologia nova')
  })
})

// ---------------------------------------------------------------------------
// runReviewPass — orquestração da 2ª etapa (revisão -> patches -> validação)
// ---------------------------------------------------------------------------

describe('runReviewPass', () => {
  it('APPROVED sem correções: FINAL = DRAFT quando a validação passa', async () => {
    mockGenerateObject.mockResolvedValue({ object: { status: 'APPROVED', corrections: [] } })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const draft = makeDraft()
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('APPROVED')
    expect(result.exegese).toBe(draft.exegese)
    expect(mockGenerateObject).toHaveBeenCalledTimes(1) // exatamente 1 chamada de revisão
  })

  it('CORRECTED: aplica os patches e aprova quando a validação passa', async () => {
    const novaExegese = longText('exegese corrigida pela revisão', 40)
    mockGenerateObject.mockResolvedValue({
      object: { status: 'CORRECTED', corrections: [corr('setSection', { section: 'exegese', text: novaExegese })] },
    })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const result = await runReviewPass(makeDraft())

    expect(result.auditStatus).toBe('APPROVED')
    expect(result.exegese).toBe(novaExegese)
  })

  it('validação final reprova: fica NEEDS_REVIEW com a versão corrigida', async () => {
    mockGenerateObject.mockResolvedValue({
      object: { status: 'CORRECTED', corrections: [corr('setSection', { section: 'teologia', text: longText('t', 30) })] },
    })
    mockValidate.mockResolvedValue({
      approved: false,
      issues: [{ severity: 'HIGH', type: 'STRONG_INVALID', problem: 'x', correctionInstruction: 'y', field: 'wordAnalysis' }],
    })

    const result = await runReviewPass(makeDraft())

    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.auditDetails).toMatch(/Issues residuais após revisão/i)
  })

  it('patch inválido: mantém o draft intacto como NEEDS_REVIEW e NÃO valida', async () => {
    mockGenerateObject.mockResolvedValue({
      object: { status: 'CORRECTED', corrections: [corr('replaceWord', { index: 999, word: { strongCode: 'G1', originalWord: 'a', transliteration: 'a', meaning: 'a', contextAnalysis: 'a' } })] },
    })

    const draft = makeDraft()
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.auditDetails).toMatch(/inválidas/i)
    expect(result.wordAnalysis).toEqual(draft.wordAnalysis) // draft intacto
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('falha da API na revisão: mantém o draft intacto como NEEDS_REVIEW', async () => {
    mockGenerateObject.mockRejectedValue(new Error('API indisponível'))

    const draft = makeDraft()
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.auditDetails).toMatch(/falhou/i)
    expect(result.exegese).toBe(draft.exegese) // draft intacto
    expect(mockValidate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cache / dedup / retry — decisão pura (usada pela rota dentro da transação)
// ---------------------------------------------------------------------------

describe('decideAnalysisMode', () => {
  const fresh = () => new Date().toISOString()

  it('APPROVED válido → cache (retorna do banco, sem IA)', () => {
    expect(decideAnalysisMode({ auditStatus: 'APPROVED' }, true)).toBe('cache')
  })

  it('GENERATING recente → inflight (dedup)', () => {
    expect(decideAnalysisMode({ auditStatus: 'GENERATING', progressUpdatedAt: fresh() }, true)).toBe('inflight')
  })

  it('GENERATING obsoleto (restart) → generate', () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString()
    expect(decideAnalysisMode({ auditStatus: 'GENERATING', progressUpdatedAt: old }, true)).toBe('generate')
  })

  it('NEEDS_REVIEW com draft utilizável → review-retry (não regera)', () => {
    const data = { auditStatus: 'NEEDS_REVIEW', wordAnalysis: [{ strongCode: 'G1' }], exegese: 'conteúdo do draft' }
    expect(decideAnalysisMode(data, true)).toBe('review-retry')
  })

  it('NEEDS_REVIEW sem draft utilizável → generate', () => {
    expect(decideAnalysisMode({ auditStatus: 'NEEDS_REVIEW', wordAnalysis: [], exegese: '' }, true)).toBe('generate')
  })

  it('ERROR e doc inexistente → generate', () => {
    expect(decideAnalysisMode({ auditStatus: 'ERROR' }, true)).toBe('generate')
    expect(decideAnalysisMode(undefined, false)).toBe('generate')
  })
})

describe('extractStoredDraft / isStaleGenerating', () => {
  it('extractStoredDraft reconstrói o VerseAnalysisResult do doc persistido', () => {
    const stored = {
      reference: 'João 1:1',
      verseText: 'texto',
      testament: 'NT',
      wordAnalysis: [{ strongCode: 'G3056', originalWord: 'λόγος', transliteration: 'logos', meaning: 'm', contextAnalysis: 'c' }],
      exegese: 'e',
      hermeneutica: 'h',
      contextoHistoricoCultural: 'chc',
      contextoLiterario: 'cl',
      teologia: 't',
      referenciasCruzadas: [{ referencia: 'João 1:14', tipo: 'paralelo', descricao: 'd' }],
    }
    const draft = extractStoredDraft(stored, 'fallbackRef', 'fallbackText')
    expect(draft.reference).toBe('João 1:1')
    expect(draft.auditStatus).toBe('NEEDS_REVIEW')
    expect(draft.wordAnalysis).toHaveLength(1)
    expect(draft.referenciasCruzadas[0].referencia).toBe('João 1:14')
  })

  it('extractStoredDraft usa os fallbacks quando faltam campos', () => {
    const draft = extractStoredDraft({}, 'Ref 1:1', 'Texto de fallback')
    expect(draft.reference).toBe('Ref 1:1')
    expect(draft.verseText).toBe('Texto de fallback')
    expect(draft.testament).toBe('NT')
    expect(draft.wordAnalysis).toEqual([])
  })

  it('isStaleGenerating só marca obsoleto GENERATING antigo', () => {
    expect(isStaleGenerating({ auditStatus: 'APPROVED' })).toBe(false)
    expect(isStaleGenerating({ auditStatus: 'GENERATING', progressUpdatedAt: new Date().toISOString() })).toBe(false)
    expect(isStaleGenerating({ auditStatus: 'GENERATING', progressUpdatedAt: new Date(Date.now() - 10 * 60_000).toISOString() })).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// BATERIA FINAL — integridade, recuperação e economia de requisições
// ---------------------------------------------------------------------------

describe('Bateria final: integridade e economia', () => {
  it('1. GERAÇÃO PERFEITA: APPROVED sem patches → 1 chamada de revisão, draft não mutado, final = draft', async () => {
    mockGenerateObject.mockResolvedValue({ object: { status: 'APPROVED', corrections: [] } })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const draft = makeDraft()
    const snapshot = JSON.parse(JSON.stringify(draft))
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('APPROVED')
    expect(draft).toEqual(snapshot) // draft preservado (não mutado)
    expect(result.exegese).toBe(draft.exegese)
    expect(result.wordAnalysis).toEqual(draft.wordAnalysis)
    expect(result.referenciasCruzadas).toEqual(draft.referenciasCruzadas)
    expect(mockGenerateObject).toHaveBeenCalledTimes(1) // revisão = exatamente 1 chamada de IA
  })

  it('2. ERRO CORRIGÍVEL: setSection troca a seção; as demais ficam byte-for-byte iguais', async () => {
    const nova = longText('exegese corrigida pela revisão', 40)
    mockGenerateObject.mockResolvedValue({
      object: { status: 'CORRECTED', corrections: [corr('setSection', { section: 'exegese', text: nova })] },
    })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const draft = makeDraft()
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('APPROVED')
    expect(result.exegese).toBe(nova)
    expect(result.hermeneutica).toBe(draft.hermeneutica)
    expect(result.contextoHistoricoCultural).toBe(draft.contextoHistoricoCultural)
    expect(result.contextoLiterario).toBe(draft.contextoLiterario)
    expect(result.teologia).toBe(draft.teologia)
    expect(result.wordAnalysis).toEqual(draft.wordAnalysis)
    expect(result.referenciasCruzadas).toEqual(draft.referenciasCruzadas)
  })

  it('3. PATCH MALFORMADO (corrections ausente na resposta): NEEDS_REVIEW, draft intacto', async () => {
    mockGenerateObject.mockResolvedValue({ object: { status: 'CORRECTED' } }) // shape inválido
    const draft = makeDraft()
    const result = await runReviewPass(draft)
    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.exegese).toBe(draft.exegese)
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('3b. PATCH em seção protegida/inexistente é rejeitado (draft intacto)', () => {
    const draft = makeDraft()
    expect(applyReviewCorrections(draft, [corr('setSection', { section: 'reference', text: 'x' })] as Corrections).ok).toBe(false)
    expect(applyReviewCorrections(draft, [corr('setSection', { section: 'verseText', text: 'x' })] as Corrections).ok).toBe(false)
    expect(applyReviewCorrections(draft, [corr('setSection', { section: 'testament', text: 'AT' })] as Corrections).ok).toBe(false)
  })

  it('4. FALHA DA API na revisão: NEEDS_REVIEW, sem 3ª chamada, sem regeneração', async () => {
    mockGenerateObject.mockRejectedValue(new Error('timeout'))
    const draft = makeDraft()
    const result = await runReviewPass(draft)
    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.exegese).toBe(draft.exegese)
    expect(mockGenerateObject).toHaveBeenCalledTimes(1) // nenhuma chamada extra
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('5. RETRY de NEEDS_REVIEW: reusa o draft, roda só a revisão e promove a APPROVED', async () => {
    // Doc persistido em NEEDS_REVIEW com draft utilizável.
    const stored: Record<string, unknown> = { ...makeDraft(), auditStatus: 'NEEDS_REVIEW' }
    expect(decideAnalysisMode(stored, true)).toBe('review-retry') // a rota NÃO regera

    const draft = extractStoredDraft(stored, 'João 1:1', 'texto')
    mockGenerateObject.mockResolvedValue({ object: { status: 'APPROVED', corrections: [] } })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const result = await runReviewPass(draft)
    expect(result.auditStatus).toBe('APPROVED')
    expect(mockGenerateObject).toHaveBeenCalledTimes(1) // só revisão, nenhuma geração
  })

  it('7. CONCORRÊNCIA: N pedidos simultâneos → 1 geração + (N-1) inflight (dedup)', async () => {
    // Modela a transação serializável do Firestore: cada claim vê as escritas
    // das anteriores. O primeiro reivindica (generate/GENERATING); os demais
    // veem GENERATING e caem em inflight — 1 geração + 1 revisão no total.
    let doc: Record<string, unknown> | undefined
    let lock: Promise<unknown> = Promise.resolve()
    const runTxn = <T>(fn: () => T): Promise<T> => {
      const result = lock.then(() => fn())
      lock = result.catch(() => undefined)
      return result
    }
    const claim = () =>
      runTxn(() => {
        const mode = decideAnalysisMode(doc, doc !== undefined)
        if (mode === 'generate') {
          doc = { auditStatus: 'GENERATING', progressUpdatedAt: new Date().toISOString() }
        }
        return mode
      })

    const modes = await Promise.all(Array.from({ length: 10 }, () => claim()))
    expect(modes.filter((m) => m === 'generate')).toHaveLength(1)
    expect(modes.filter((m) => m === 'inflight')).toHaveLength(9)
  })

  it('8. ANÁLISE GRANDE: patch pequeno sobre draft enorme aprova sem reproduzir o conteúdo', async () => {
    const draft = makeDraft({ exegese: longText('conteúdo extenso da exegese', 4000) })
    expect(draft.exegese.length).toBeGreaterThan(50_000)
    const nova = longText('teologia revisada', 30)
    mockGenerateObject.mockResolvedValue({
      object: { status: 'CORRECTED', corrections: [corr('setSection', { section: 'teologia', text: nova })] },
    })
    mockValidate.mockResolvedValue({ approved: true, issues: [] })

    const result = await runReviewPass(draft)
    expect(result.auditStatus).toBe('APPROVED')
    expect(result.exegese.length).toBe(draft.exegese.length) // conteúdo extenso intacto
    expect(result.teologia).toBe(nova)
  })

  it('9. SETSECTION GRANDE: substitui integralmente a maior seção sem danificar as outras', () => {
    const draft = makeDraft()
    const huge = longText('seção enorme substituída', 6000)
    const res = applyReviewCorrections(draft, [corr('setSection', { section: 'exegese', text: huge })] as Corrections)
    expect(res.ok).toBe(true)
    expect(res.result!.exegese).toBe(huge)
    expect(res.result!.hermeneutica).toBe(draft.hermeneutica)
    expect(res.result!.teologia).toBe(draft.teologia)
    // JSON final permanece serializável/válido
    expect(() => JSON.stringify(res.result)).not.toThrow()
  })
})

describe('runReviewPass — auditor adversarial retorna NEEDS_REVIEW', () => {
  it('status NEEDS_REVIEW da auditoria mantém o draft intacto e não aprova', async () => {
    // O auditor achou um problema que não consegue corrigir com segurança.
    mockGenerateObject.mockResolvedValue({ object: { status: 'NEEDS_REVIEW', corrections: [] } })

    const draft = makeDraft()
    const result = await runReviewPass(draft)

    expect(result.auditStatus).toBe('NEEDS_REVIEW')
    expect(result.auditDetails).toMatch(/não pôde ser corrigido com segurança/i)
    expect(result.exegese).toBe(draft.exegese) // draft preservado
    expect(mockValidate).not.toHaveBeenCalled() // não valida nem aprova
  })
})
