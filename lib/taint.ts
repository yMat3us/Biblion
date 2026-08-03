import 'server-only'

import * as React from 'react'

// As APIs de taint só existem quando `experimental.taint` está ativo (canal
// experimental do React, no runtime RSC). Acessamos por leitura opcional para
// que, em React estável (testes) ou fora do RSC (route handlers), tudo vire
// no-op em vez de quebrar. Taint é DEFESA EM PROFUNDIDADE, nunca a única camada.
type TaintObjectFn = (message: string, object: object) => void
type TaintValueFn = (message: string, lifetime: object, value: string) => void

const taintObjectReference = (React as unknown as { experimental_taintObjectReference?: TaintObjectFn })
  .experimental_taintObjectReference
const taintUniqueValue = (React as unknown as { experimental_taintUniqueValue?: TaintValueFn })
  .experimental_taintUniqueValue

/** Impede que um objeto inteiro (ex.: registro cru com campos sensíveis) atravesse
 *  a fronteira server->client. No-op quando a API não está disponível. */
export function taintObject(message: string, object: object): void {
  taintObjectReference?.(message, object)
}

/** Impede que um valor único (ex.: token/segredo) seja serializado ao client,
 *  mesmo reatribuído. No-op quando a API não está disponível ou o valor é vazio. */
export function taintValue(message: string, lifetime: object, value: string): void {
  if (value) taintUniqueValue?.(message, lifetime, value)
}

// Segredos de ambiente que jamais devem cruzar para o client.
const SECRET_ENV = [
  'DATABASE_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'OPENAI_API_KEY',
] as const

let initialized = false

/**
 * Marca os segredos de ambiente como não-serializáveis ao client. Chamado do
 * layout raiz (RSC). Idempotente e seguro fora do runtime de taint.
 */
export function initServerTaint(): void {
  if (initialized) return
  initialized = true
  for (const name of SECRET_ENV) {
    const value = process.env[name]
    if (value) taintValue(`Segredo ${name} não pode ser enviado ao cliente.`, process.env, value)
  }
}
