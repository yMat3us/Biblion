/**
 * VALIDADOR DETERMINÍSTICO — Camada 4 do "Tribunal Teológico"
 *
 * ★ NÃO USA IA — É CÓDIGO PURO ★
 *
 * Verifica programaticamente dados que a IA pode alucinar:
 *   4A. Strong Numbers: formato, range, testamento
 *   4B. Referências cruzadas: livro, capítulo e versículo existem nos JSON reais
 *   4C. Consistência interna: idioma do testamento, coerência entre seções
 *   4D. Completude: todas as seções preenchidas, mínimos de conteúdo
 *   4E. Sanitização: placeholders, padrões de alucinação comuns
 */

import { LIVROS_BIBLIA, getLivro } from '@/data/livros'
import { readVersionFromFs } from '@/lib/bible'
import { validateStrongCode, isStrongForTestament } from '@/lib/strong-numbers'
import type {
  VerseAnalysisResult,
  WordAnalysisEntry,
  CrossReference,
  AuditIssue,
  DeterministicValidationResult,
} from '@/lib/ai-audit-types'

// ---------------------------------------------------------------------------
// Parsing de referências bíblicas
// ---------------------------------------------------------------------------

interface ParsedReference {
  bookName: string
  bookIndex: number
  chapter: number
  verseStart?: number
  verseEnd?: number
}

/**
 * Parseia referências como "João 3:16", "1 Samuel 3:5-10", "Gn 1:1".
 * Retorna null se o formato for inválido ou o livro não existir.
 */
function parseReference(ref: string): ParsedReference | null {
  const trimmed = ref.trim()
  if (!trimmed) return null

  // Padrão: "Livro Cap:VerInício-VerFim" — capítulo obrigatório, verso opcional
  const match = trimmed.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/)
  if (!match) return null

  const bookQuery = match[1].trim()
  const chapter = parseInt(match[2], 10)
  const verseStart = match[3] ? parseInt(match[3], 10) : undefined
  const verseEnd = match[4] ? parseInt(match[4], 10) : undefined

  const livro = getLivro(bookQuery)
  if (!livro) return null

  const bookIndex = LIVROS_BIBLIA.findIndex((l) => l.nome === livro.nome)
  return { bookName: livro.nome, bookIndex, chapter, verseStart, verseEnd }
}

// ---------------------------------------------------------------------------
// 4A — Validação de Strong Numbers
// ---------------------------------------------------------------------------

function validateWordStrongs(words: WordAnalysisEntry[], testament: 'AT' | 'NT'): AuditIssue[] {
  const issues: AuditIssue[] = []

  for (const word of words) {
    // Formato e range
    const validation = validateStrongCode(word.strongCode)
    if (!validation.valid) {
      issues.push({
        severity: 'HIGH',
        type: 'STRONG_INVALID',
        problem: `Strong inválido para "${word.originalWord}" (${word.transliteration}): ${validation.error}`,
        correctionInstruction: `Corrija o código Strong "${word.strongCode}" para "${word.originalWord}". O formato correto é ${testament === 'AT' ? 'H[1–8674]' : 'G[1–5624]'}.`,
        field: 'wordAnalysis',
      })
      continue
    }

    // Testamento
    const testamentCheck = isStrongForTestament(word.strongCode, testament)
    if (!testamentCheck.valid) {
      issues.push({
        severity: 'HIGH',
        type: 'STRONG_TESTAMENT_MISMATCH',
        problem: testamentCheck.error!,
        correctionInstruction: `O versículo é do ${testament === 'AT' ? 'Antigo' : 'Novo'} Testamento. Use Strong ${testament === 'AT' ? 'hebraico (H)' : 'grego (G)'} para a palavra "${word.originalWord}".`,
        field: 'wordAnalysis',
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// 4B — Validação de referências cruzadas contra dados reais
// ---------------------------------------------------------------------------

async function validateSingleReference(ref: CrossReference): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = []
  const parsed = parseReference(ref.referencia)

  if (!parsed) {
    // Tenta identificar se é só o livro que é inválido
    issues.push({
      severity: 'HIGH',
      type: 'REF_BOOK_INVALID',
      problem: `Referência inválida ou livro não reconhecido: "${ref.referencia}".`,
      correctionInstruction: `Corrija a referência "${ref.referencia}". Use nome completo ou abreviação canônica dos 66 livros (ex: "João 3:16", "Gn 1:1", "1 Coríntios 13:4").`,
      field: 'referenciasCruzadas',
    })
    return issues
  }

  const livro = LIVROS_BIBLIA[parsed.bookIndex]

  // Verifica se o capítulo existe
  if (parsed.chapter < 1 || parsed.chapter > livro.capitulos) {
    issues.push({
      severity: 'CRITICAL',
      type: 'REF_CHAPTER_OVERFLOW',
      problem: `${livro.nome} tem ${livro.capitulos} capítulo(s), mas a referência cita capítulo ${parsed.chapter}: "${ref.referencia}".`,
      correctionInstruction: `Corrija "${ref.referencia}": ${livro.nome} tem apenas ${livro.capitulos} capítulo(s). Use um capítulo entre 1 e ${livro.capitulos}.`,
      field: 'referenciasCruzadas',
    })
    return issues // Sem sentido checar versículo se capítulo é inválido
  }

  // Verifica se os versículos existem contra os dados reais (ACF como referência)
  if (parsed.verseStart !== undefined) {
    try {
      const bibleData = await readVersionFromFs('ACF')
      const book = bibleData[parsed.bookIndex]
      if (book) {
        const chapterVerses = book.chapters[parsed.chapter - 1]
        if (chapterVerses) {
          const maxVerse = chapterVerses.length

          if (parsed.verseStart < 1 || parsed.verseStart > maxVerse) {
            issues.push({
              severity: 'CRITICAL',
              type: 'REF_VERSE_OVERFLOW',
              problem: `${livro.nome} ${parsed.chapter} tem ${maxVerse} versículo(s), mas a referência cita versículo ${parsed.verseStart}: "${ref.referencia}".`,
              correctionInstruction: `Corrija "${ref.referencia}": ${livro.nome} ${parsed.chapter} tem ${maxVerse} versículos (1–${maxVerse}).`,
              field: 'referenciasCruzadas',
            })
          }

          if (parsed.verseEnd !== undefined && (parsed.verseEnd < 1 || parsed.verseEnd > maxVerse)) {
            issues.push({
              severity: 'CRITICAL',
              type: 'REF_VERSE_OVERFLOW',
              problem: `${livro.nome} ${parsed.chapter} tem ${maxVerse} versículo(s), mas a referência cita versículo final ${parsed.verseEnd}: "${ref.referencia}".`,
              correctionInstruction: `Corrija "${ref.referencia}": o versículo final excede o máximo de ${maxVerse} para ${livro.nome} ${parsed.chapter}.`,
              field: 'referenciasCruzadas',
            })
          }
        }
      }
    } catch {
      // Se não conseguir ler o JSON, pula validação de versículo (graceful degradation)
    }
  }

  return issues
}

async function validateCrossReferences(refs: CrossReference[]): Promise<AuditIssue[]> {
  const allIssues: AuditIssue[] = []
  for (const ref of refs) {
    const refIssues = await validateSingleReference(ref)
    allIssues.push(...refIssues)
  }
  return allIssues
}

// ---------------------------------------------------------------------------
// 4C — Validação de consistência interna
// ---------------------------------------------------------------------------

function validateConsistency(data: VerseAnalysisResult): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (data.testament === 'AT') {
    // Detecta termos gregos do NT que não deveriam aparecer em exegese do AT
    const greekNTTerms =
      /\b(logos|rhema|agape|pistis|charis|sozo|dikaiosyne|pneuma|sarx|kosmos|ekklesia|kerygma|euangelion|parousia|kenosis)\b/i

    if (greekNTTerms.test(data.exegese)) {
      issues.push({
        severity: 'MEDIUM',
        type: 'TESTAMENT_LANGUAGE_LEAK',
        problem: 'Termos gregos do Novo Testamento encontrados na exegese de um versículo do Antigo Testamento.',
        correctionInstruction:
          'Remova ou substitua termos gregos neotestamentários. O versículo é do AT — use apenas termos hebraicos/aramaicos na análise linguística.',
        field: 'exegese',
      })
    }
  }

  if (data.testament === 'NT') {
    // NT pode legitimamente referenciar hebraico em citações do AT.
    // Alerta apenas se a análise foca EXCLUSIVAMENTE em hebraico sem mencionar citação.
    const hebrewOnlyFocus = /\b(texto massorético|apenas em hebraico|somente no hebraico)\b/i
    const mentionsCitation = /\b(cita|citação|citando|alude|alusão|referência ao AT|Antigo Testamento)\b/i

    if (hebrewOnlyFocus.test(data.exegese) && !mentionsCitation.test(data.exegese)) {
      issues.push({
        severity: 'LOW',
        type: 'TESTAMENT_LANGUAGE_LEAK',
        problem:
          'Análise focada exclusivamente em hebraico para versículo do NT sem indicar citação do AT.',
        correctionInstruction:
          'O versículo é do NT — a análise primária deve ser em grego. Se referencia o AT, indique explicitamente que é uma citação.',
        field: 'exegese',
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// 4D — Validação de completude
// ---------------------------------------------------------------------------

/** Mínimos de caracteres por seção (Exegese e Hermenêutica são extensas). */
const SECTION_MINIMUMS: Array<{
  key: keyof VerseAnalysisResult
  label: string
  minLength: number
}> = [
  { key: 'exegese', label: 'Exegese', minLength: 500 },
  { key: 'hermeneutica', label: 'Hermenêutica', minLength: 400 },
  { key: 'contextoHistoricoCultural', label: 'Contexto Histórico-Cultural', minLength: 200 },
  { key: 'contextoLiterario', label: 'Contexto Literário', minLength: 200 },
  { key: 'teologia', label: 'Teologia', minLength: 200 },
]

function validateCompleteness(data: VerseAnalysisResult): AuditIssue[] {
  const issues: AuditIssue[] = []

  // Análise palavra-por-palavra
  if (!data.wordAnalysis || data.wordAnalysis.length < 2) {
    issues.push({
      severity: 'HIGH',
      type: 'INCOMPLETE_WORD_ANALYSIS',
      problem: `Análise palavra-por-palavra tem apenas ${data.wordAnalysis?.length ?? 0} entrada(s). Um versículo tem no mínimo 2 palavras significativas.`,
      correctionInstruction:
        'Analise TODAS as palavras significativas do versículo no texto original (hebraico/aramaico ou grego). Inclua substantivos, verbos, preposições e partículas relevantes.',
      field: 'wordAnalysis',
    })
  }

  // Campos obrigatórios de cada entrada de palavra
  if (data.wordAnalysis) {
    for (let i = 0; i < data.wordAnalysis.length; i++) {
      const word = data.wordAnalysis[i]
      const missing: string[] = []
      if (!word.strongCode?.trim()) missing.push('strongCode')
      if (!word.originalWord?.trim()) missing.push('originalWord')
      if (!word.transliteration?.trim()) missing.push('transliteration')
      if (!word.meaning?.trim()) missing.push('meaning')

      if (missing.length > 0) {
        issues.push({
          severity: 'HIGH',
          type: 'INCOMPLETE_WORD_ANALYSIS',
          problem: `Palavra ${i + 1} ("${word.originalWord || word.transliteration || '?'}") incompleta. Campos faltando: ${missing.join(', ')}.`,
          correctionInstruction: `Preencha ${missing.join(', ')} para a palavra "${word.originalWord || word.transliteration || '?'}".`,
          field: 'wordAnalysis',
        })
      }
    }
  }

  // Seções textuais
  for (const check of SECTION_MINIMUMS) {
    const content = data[check.key] as string | undefined

    if (!content || content.trim().length === 0) {
      issues.push({
        severity: 'CRITICAL',
        type: 'EMPTY_SECTION',
        problem: `Seção "${check.label}" está vazia.`,
        correctionInstruction: `Produza conteúdo completo para "${check.label}" com no mínimo ${check.minLength} caracteres de análise acadêmica.`,
        field: check.key,
      })
    } else if (content.trim().length < check.minLength) {
      issues.push({
        severity: 'MEDIUM',
        type: 'EMPTY_SECTION',
        problem: `Seção "${check.label}" tem apenas ${content.trim().length} caracteres (mínimo: ${check.minLength}).`,
        correctionInstruction: `Expanda "${check.label}" para pelo menos ${check.minLength} caracteres com análise mais detalhada e profunda.`,
        field: check.key,
      })
    }
  }

  // Referências cruzadas mínimas
  if (!data.referenciasCruzadas || data.referenciasCruzadas.length < 3) {
    issues.push({
      severity: 'MEDIUM',
      type: 'INCOMPLETE_WORD_ANALYSIS',
      problem: `Apenas ${data.referenciasCruzadas?.length ?? 0} referência(s) cruzada(s). Mínimo esperado: 3.`,
      correctionInstruction:
        'Forneça pelo menos 3 referências cruzadas relevantes, cada uma com referência, tipo (paralelo|alusao|tipologia|profecia) e descrição.',
      field: 'referenciasCruzadas',
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// 4E — Sanitização de alucinações comuns
// ---------------------------------------------------------------------------

function sanitizeHallucinations(data: VerseAnalysisResult): AuditIssue[] {
  const issues: AuditIssue[] = []

  // Detecta conteúdo placeholder / gerado sem substância
  const placeholderPatterns =
    /\b(TODO|PLACEHOLDER|INSERIR AQUI|COMPLETAR|lorem ipsum|exemplo genérico|texto de exemplo)\b/i

  const fieldsToCheck: Array<{ key: keyof VerseAnalysisResult; label: string }> = [
    { key: 'exegese', label: 'Exegese' },
    { key: 'hermeneutica', label: 'Hermenêutica' },
    { key: 'contextoHistoricoCultural', label: 'Contexto Histórico-Cultural' },
    { key: 'contextoLiterario', label: 'Contexto Literário' },
    { key: 'teologia', label: 'Teologia' },
  ]

  for (const field of fieldsToCheck) {
    const content = data[field.key] as string | undefined
    if (content && placeholderPatterns.test(content)) {
      issues.push({
        severity: 'CRITICAL',
        type: 'PLACEHOLDER_CONTENT',
        problem: `Conteúdo placeholder detectado na seção "${field.label}".`,
        correctionInstruction: `Substitua todo conteúdo placeholder em "${field.label}" por análise teológica real, acadêmica e completa.`,
        field: field.key,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Função principal — executa TODAS as validações
// ---------------------------------------------------------------------------

/**
 * Executa a validação determinística completa (Camada 4).
 *
 * Retorna `approved: true` se não houver issues CRITICAL ou HIGH.
 * Issues MEDIUM e LOW são informativas e não bloqueiam a aprovação.
 */
export async function runDeterministicValidation(
  data: VerseAnalysisResult,
): Promise<DeterministicValidationResult> {
  const issues: AuditIssue[] = []

  // 4A: Strong Numbers
  if (data.wordAnalysis) {
    issues.push(...validateWordStrongs(data.wordAnalysis, data.testament))
  }

  // 4B: Referências cruzadas
  if (data.referenciasCruzadas) {
    const refIssues = await validateCrossReferences(data.referenciasCruzadas)
    issues.push(...refIssues)
  }

  // 4C: Consistência interna
  issues.push(...validateConsistency(data))

  // 4D: Completude
  issues.push(...validateCompleteness(data))

  // 4E: Sanitização de alucinações
  issues.push(...sanitizeHallucinations(data))

  const hasCriticalOrHigh = issues.some(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH',
  )

  return {
    approved: !hasCriticalOrHigh,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Gerador de prompt de correção
// ---------------------------------------------------------------------------

/**
 * Converte issues do validador determinístico em instruções textuais
 * para reenviar ao módulo gerador da IA.
 */
export function generateCorrectionPrompt(issues: AuditIssue[]): string {
  if (issues.length === 0) return ''

  const grouped = issues.reduce(
    (acc, issue) => {
      const field = issue.field || 'geral'
      if (!acc[field]) acc[field] = []
      acc[field].push(issue)
      return acc
    },
    {} as Record<string, AuditIssue[]>,
  )

  const parts: string[] = [
    'CORREÇÕES OBRIGATÓRIAS DO VALIDADOR DETERMINÍSTICO (estas NÃO são sugestões — são ERROS FACTUAIS que DEVEM ser corrigidos):',
  ]

  for (const [field, fieldIssues] of Object.entries(grouped)) {
    parts.push(`\n[${field}]:`)
    for (const issue of fieldIssues) {
      parts.push(`  - [${issue.severity}/${issue.type}] ${issue.correctionInstruction}`)
    }
  }

  return parts.join('\n')
}
