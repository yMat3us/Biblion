import { createHash } from 'node:crypto'
import { ApiErrors } from '@/lib/http'
import { logger } from '@/lib/logger'

// Política de senha forte. A blocklist local está SEMPRE ativa; a verificação
// HIBP (Have I Been Pwned) por k-anonymity é OPCIONAL (env PASSWORD_HIBP_CHECK)
// e FAIL-OPEN: se a API estiver indisponível, não bloqueia o usuário.

// Senhas notoriamente fracas + termos do próprio produto. Normalizadas em minúsculas.
const LOCAL_BLOCKLIST = new Set(
  [
    '12345678', '123456789', '1234567890', 'password', 'senha123', 'password1', 'password123',
    'qwertyui', 'qwerty123', 'iloveyou', 'admin123', 'welcome1', 'welcome123', 'letmein1',
    'abc12345', 'aaaaaaaa', '11111111', '00000000', 'sunshine', 'princess', 'football',
    'baseball', 'trustno1', 'superman', 'batman123', 'michael1', 'jennifer', 'shadow12',
    'senhasenha', 'mudar123', 'trocar123', 'biblion123', 'biblion2024', 'biblion2025',
    'jesus123', 'deus1234', 'amem1234', 'igreja123', 'pastor123',
  ].map((value) => value.toLowerCase()),
)

const HIBP_TIMEOUT_MS = 2_000

/** Verifica a senha no HIBP via k-anonymity (envia só o prefixo do SHA-1).
 *  FAIL-OPEN: qualquer falha de rede/HTTP retorna false (não bloqueia). */
async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    })
    if (!response.ok) return false
    const body = await response.text()
    return body.split('\n').some((line) => line.split(':')[0]?.trim().toUpperCase() === suffix)
  } catch (error) {
    // Fail-open: indisponibilidade do HIBP não pode travar troca/criação de senha.
    logger.warn('hibp_check_unavailable', { error })
    return false
  }
}

/**
 * Valida a força da senha. Lança ApiError(400) com mensagem clara ao reprovar.
 * Comprimento mínimo já é garantido pelo Zod; aqui reforçamos e adicionamos
 * blocklist, semelhança com o usuário, padrões triviais e (opcional) HIBP.
 */
export async function assertStrongPassword(password: string, opts?: { username?: string }): Promise<void> {
  if (password.length < 8) throw ApiErrors.badRequest('A senha deve ter pelo menos 8 caracteres')

  const normalized = password.trim().toLowerCase()

  if (LOCAL_BLOCKLIST.has(normalized)) {
    throw ApiErrors.badRequest('Essa senha é muito comum. Escolha uma senha mais forte.')
  }

  if (/^(.)\1+$/.test(password)) {
    throw ApiErrors.badRequest('A senha não pode ser um único caractere repetido.')
  }

  const username = opts?.username?.trim().toLowerCase()
  if (username && username.length >= 3 && normalized.includes(username)) {
    throw ApiErrors.badRequest('A senha não pode conter o seu nome de usuário.')
  }

  if (process.env.PASSWORD_HIBP_CHECK === 'true' && (await isPwnedPassword(password))) {
    throw ApiErrors.badRequest('Essa senha apareceu em vazamentos de dados conhecidos. Escolha outra.')
  }
}

// Exportado para teste (a blocklist não deve encolher silenciosamente).
export const __blocklistSizeForTest = LOCAL_BLOCKLIST.size
