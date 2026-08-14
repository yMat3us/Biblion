/**
 * Tipos compartilhados do sistema de auditoria teológica intransponível.
 *
 * Estas interfaces definem o contrato entre:
 * - Os módulos geradores (IA)
 * - Os auditores de módulo e global (IA)
 * - O validador determinístico (código puro)
 * - A interface de exibição (React)
 */

// ---------------------------------------------------------------------------
// Classificação de erros
// ---------------------------------------------------------------------------

export const ISSUE_TYPES = [
  // Erros de Strong Numbers (validador determinístico)
  'STRONG_INVALID',
  'STRONG_TESTAMENT_MISMATCH',

  // Erros de referências (validador determinístico)
  'REF_BOOK_INVALID',
  'REF_CHAPTER_OVERFLOW',
  'REF_VERSE_OVERFLOW',

  // Erros linguísticos (auditor IA)
  'MORPHOLOGY_OVERCLAIM',
  'LEXICAL_OVERCLAIM',
  'SYNTACTIC_ERROR',
  'TRANSLATION_ERROR',
  'COLWELL_REVERSE_INFERENCE',

  // Erros teológicos (auditor IA)
  'THEOLOGICAL_LEAP',
  'HISTORICAL_ATTRIBUTION_UNSOURCED',
  'INTERPRETIVE_OVERSTATEMENT',
  'INTERTEXTUALITY_OVERCLAIM',
  'CONFESSIONAL_BIAS',

  // Erros cruzados (auditor global)
  'CROSS_SECTION_CONTRADICTION',
  'LOGICAL_FALLACY',

  // Erros de consistência (validador determinístico)
  'TESTAMENT_LANGUAGE_LEAK',

  // Erros de completude (validador determinístico)
  'INCOMPLETE_WORD_ANALYSIS',
  'EMPTY_SECTION',
  'PLACEHOLDER_CONTENT',
] as const

export type IssueType = (typeof ISSUE_TYPES)[number]
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type AuditStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'GENERATING' | 'ERROR'

// ---------------------------------------------------------------------------
// Progresso da geração (tempo real)
// ---------------------------------------------------------------------------

/**
 * Fase atual do pipeline. Usada para escolher o rótulo/ícone na UI e para saber
 * se estamos parados aguardando o limite de requisições (rate limit) da IA.
 */
export type AnalysisPhase =
  | 'starting'
  | 'module'
  | 'audit'
  | 'validation'
  | 'reviewing'
  | 'rate-limit'
  | 'done'
  | 'error'

/**
 * Instantâneo de progresso emitido pelo pipeline a cada marco (início de módulo,
 * auditoria, validação) e durante as esperas de rate limit. É persistido no doc
 * do Firestore e lido pelo frontend via polling para desenhar a barra de
 * progresso e o texto de status ao vivo.
 */
export interface AnalysisProgress {
  /** Percentual monotônico (0-100). Nunca regride. */
  progress: number
  /** Fase atual do pipeline. */
  phase: AnalysisPhase
  /** Mensagem legível em pt-BR (ex: "Módulo 2: Exegese"). */
  statusMessage: string
  /** Número do módulo atual (1-6), quando aplicável. */
  currentModule?: number
  /** Total de módulos do pipeline (para "Módulo X de Y"). */
  totalModules?: number
  /** true enquanto aguardamos a janela de rate limit da IA. */
  waitingRateLimit?: boolean
  /** Segundos estimados restantes de espera de rate limit (quando aplicável). */
  rateLimitSeconds?: number
}

/** Callback invocado pelo pipeline a cada atualização de progresso. */
export type ProgressCallback = (progress: AnalysisProgress) => void

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export interface AuditIssue {
  severity: Severity
  type: IssueType
  problem: string
  correctionInstruction: string
  /** Campo afetado no VerseAnalysisResult (para correções direcionadas). */
  field?: string
}

export interface ModuleAuditResult {
  approved: boolean
  issues: AuditIssue[]
}

export interface GlobalAuditResult {
  approved: boolean
  issues: (AuditIssue & { moduleNumber: number })[]
}

export interface DeterministicValidationResult {
  approved: boolean
  issues: AuditIssue[]
}

// ---------------------------------------------------------------------------
// Análise palavra-por-palavra
// ---------------------------------------------------------------------------

export interface WordAnalysisEntry {
  /** Código Strong (ex: H120, G3056). */
  strongCode: string
  /** Palavra no script original (ex: אִישׁ, λόγος). */
  originalWord: string
  /** Transliteração latina (ex: ish, logos). */
  transliteration: string
  /** Significado/tradução concisa. */
  meaning: string
  /** Análise contextual: como essa palavra funciona neste versículo. */
  contextAnalysis: string
}

// ---------------------------------------------------------------------------
// Referências cruzadas
// ---------------------------------------------------------------------------

export type CrossReferenceType = 'paralelo' | 'alusao' | 'tipologia' | 'profecia'

export interface CrossReference {
  /** Referência no formato canônico (ex: "João 3:16"). */
  referencia: string
  /** Tipo do relacionamento intertextual. */
  tipo: CrossReferenceType
  /** Descrição breve da conexão. */
  descricao: string
}

// ---------------------------------------------------------------------------
// Comparação de versões (dados reais, não IA)
// ---------------------------------------------------------------------------

export interface VersionComparisonEntry {
  /** Sigla da versão (ex: ACF, NVI, KJV). */
  version: string
  /** Nome completo (ex: "Almeida Corrigida Fiel"). */
  name: string
  /** Texto do versículo nessa versão. */
  text: string
  /** Idioma do texto (pt, en, he, el). */
  language: string
}

// ---------------------------------------------------------------------------
// Resultado completo da análise de versículo
// ---------------------------------------------------------------------------

export interface VerseAnalysisResult {
  /** Referência do versículo (ex: "João 3:16"). */
  reference: string
  /** Texto do versículo na versão do usuário. */
  verseText: string
  /** Testamento (determina idioma original: hebraico/aramaico vs grego). */
  testament: 'AT' | 'NT'

  /** Status final da auditoria. */
  auditStatus: AuditStatus
  /** Detalhes da auditoria (issues residuais, se houver). */
  auditDetails?: string

  // --- Seção 1: Análise palavra-por-palavra ---
  wordAnalysis: WordAnalysisEntry[]

  // --- Seção 2: Estudo (5 áreas) ---
  /** Exegese detalhada (extenso): texto original, morfologia, sintaxe, tradução literal, figuras, dificuldades, variantes, palavras-chave. */
  exegese: string
  /** Hermenêutica (extenso): interpretações, avaliação exegética, erros comuns, princípios aplicados. */
  hermeneutica: string
  /** Contexto histórico-cultural: situação histórica, costumes, geografia, política, cultura. */
  contextoHistoricoCultural: string
  /** Contexto literário: gênero, estrutura, fluxo, posição na perícope, intertextualidade. */
  contextoLiterario: string
  /** Teologia: implicações teológicas, cristologia, teologia bíblica, aplicação. */
  teologia: string

  // --- Seção 3: Referências cruzadas ---
  referenciasCruzadas: CrossReference[]
}
