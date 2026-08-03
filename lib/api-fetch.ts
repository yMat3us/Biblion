/**
 * Cliente HTTP resiliente para os componentes de client.
 *
 * - Timeout por tentativa via AbortController (aborta requisições penduradas).
 * - Retentativa APENAS para métodos idempotentes (GET/HEAD) em falha transitória
 *   (erro de rede, timeout ou 5xx). 4xx e abort externo nunca são repetidos.
 * - Normaliza o envelope de erro `{ error: { code, message } }` num ApiFetchError.
 *
 * Universal (usa fetch + AbortController), mas pensado para o browser.
 */

export class ApiFetchError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiFetchError'
    this.status = status
    this.code = code
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'signal'> {
  /** Timeout por tentativa em ms (padrão 15000). */
  timeoutMs?: number
  /** Retentativas para GET/HEAD em falha transitória (padrão 2). */
  retries?: number
  /** Backoff base entre tentativas em ms (padrão 300, dobra a cada tentativa). */
  retryDelayMs?: number
  /** Signal externo (ex.: desmontagem do componente) — quando aborta, não repete. */
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 2
const DEFAULT_RETRY_DELAY_MS = 300

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isIdempotent(method: string): boolean {
  return method === 'GET' || method === 'HEAD'
}

async function parseBody<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiFetchError(response.status, 'PARSE_ERROR', 'Resposta inválida do servidor')
  }
}

async function toApiError(response: Response): Promise<ApiFetchError> {
  let code = 'HTTP_ERROR'
  let message = `Erro ${response.status}`
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } }
    if (body?.error) {
      code = body.error.code ?? code
      message = body.error.message ?? message
    }
  } catch {
    // Corpo não-JSON: mantém a mensagem genérica.
  }
  return new ApiFetchError(response.status, code, message)
}

/** Uma tentativa: aplica o timeout, encadeia o signal externo e normaliza !ok. */
async function attempt<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal: AbortSignal | undefined,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Tempo de requisição esgotado', 'TimeoutError')), timeoutMs)
  const relayAbort = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', relayAbort, { once: true })

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw await toApiError(response)
    return await parseBody<T>(response)
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', relayAbort)
  }
}

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    signal,
    method = 'GET',
    ...rest
  } = options

  const upperMethod = method.toUpperCase()
  const maxAttempts = isIdempotent(upperMethod) ? Math.max(0, retries) + 1 : 1

  let lastError: unknown
  for (let n = 1; n <= maxAttempts; n += 1) {
    try {
      return await attempt<T>(url, { ...rest, method: upperMethod }, timeoutMs, signal)
    } catch (error) {
      lastError = error
      // Não repetir: abort externo, erro de cliente (4xx) ou última tentativa.
      if (signal?.aborted) throw error
      if (error instanceof ApiFetchError && error.status < 500) throw error
      if (n >= maxAttempts) throw error
      await sleep(retryDelayMs * 2 ** (n - 1))
    }
  }
  throw lastError
}
