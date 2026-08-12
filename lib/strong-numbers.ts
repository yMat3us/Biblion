/**
 * Validação determinística de Strong Numbers.
 *
 * Ranges oficiais (baseados no dicionário Strong original):
 * - Hebraico (AT): H1 – H8674
 * - Grego (NT): G1 – G5624
 *
 * As porções aramaicas do AT (Daniel 2:4–7:28, Esdras 4:8–6:18, 7:12-26,
 * Jeremias 10:11, Gênesis 31:47) ainda usam códigos H, pois o Strong
 * unificou hebraico e aramaico no mesmo dicionário.
 */

const HEBREW_STRONG_MIN = 1
const HEBREW_STRONG_MAX = 8674
const GREEK_STRONG_MIN = 1
const GREEK_STRONG_MAX = 5624

const STRONG_PATTERN = /^([HG])(\d+)$/i

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StrongValidation {
  valid: boolean
  code: string
  language: 'hebrew' | 'greek' | null
  number: number
  error?: string
}

// ---------------------------------------------------------------------------
// Validação de formato e range
// ---------------------------------------------------------------------------

/**
 * Valida um código Strong isoladamente (formato + range).
 * Não verifica testamento — use `isStrongForTestament` para isso.
 */
export function validateStrongCode(code: string): StrongValidation {
  const trimmed = code.trim().toUpperCase()
  const match = trimmed.match(STRONG_PATTERN)

  if (!match) {
    return {
      valid: false,
      code: trimmed,
      language: null,
      number: 0,
      error: `Formato inválido: "${code}". Esperado: H[número] ou G[número].`,
    }
  }

  const prefix = match[1] as 'H' | 'G'
  const num = parseInt(match[2], 10)
  const language: 'hebrew' | 'greek' = prefix === 'H' ? 'hebrew' : 'greek'

  if (prefix === 'H') {
    if (num < HEBREW_STRONG_MIN || num > HEBREW_STRONG_MAX) {
      return {
        valid: false,
        code: trimmed,
        language,
        number: num,
        error: `Strong hebraico fora do range: ${trimmed}. Range válido: H${HEBREW_STRONG_MIN}–H${HEBREW_STRONG_MAX}.`,
      }
    }
  } else {
    if (num < GREEK_STRONG_MIN || num > GREEK_STRONG_MAX) {
      return {
        valid: false,
        code: trimmed,
        language,
        number: num,
        error: `Strong grego fora do range: ${trimmed}. Range válido: G${GREEK_STRONG_MIN}–G${GREEK_STRONG_MAX}.`,
      }
    }
  }

  return { valid: true, code: trimmed, language, number: num }
}

// ---------------------------------------------------------------------------
// Validação de testamento
// ---------------------------------------------------------------------------

/**
 * Verifica se um Strong pertence ao testamento correto.
 *
 * Regras:
 * - AT deve usar H (hebraico/aramaico). Strong G em versículo do AT é erro.
 * - NT usa G (grego) primariamente. Strong H é tolerado quando o NT cita o AT,
 *   então não rejeitamos H no NT.
 */
export function isStrongForTestament(
  code: string,
  testament: 'AT' | 'NT',
): { valid: boolean; error?: string } {
  const validation = validateStrongCode(code)
  if (!validation.valid) return { valid: false, error: validation.error }

  if (testament === 'AT' && validation.language === 'greek') {
    return {
      valid: false,
      error: `Strong grego ${validation.code} usado em versículo do Antigo Testamento. O AT usa Strong hebraico (H).`,
    }
  }

  // NT primariamente usa G, mas pode referenciar H em citações do AT — tolerado.
  return { valid: true }
}

/**
 * Retorna o prefixo Strong esperado para o testamento.
 */
export function expectedStrongPrefix(testament: 'AT' | 'NT'): 'H' | 'G' {
  return testament === 'AT' ? 'H' : 'G'
}
