import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ApiErrors, ok } from '@/lib/http'
import { parseJson, loginSchema } from '@/lib/validation'
import { authenticateCredentials, createUserSession, sessionCookie } from '@/lib/auth'
import { normalizeUsername } from '@/lib/password'
import {
  clearFailures,
  clientKey,
  failureCount,
  loginBackoffSeconds,
  RateLimits,
  registerFailure,
} from '@/lib/rate-limit'

const LOGIN_FAILURE_WINDOW_MS = 15 * 60_000
const IP_FAILURE_THRESHOLD = 10
const ACCOUNT_FAILURE_THRESHOLD = 10

export const POST = route(
  async (req: NextRequest) => {
    const { username, password } = await parseJson(req, loginSchema)
    const ipKey = `login:ip:${clientKey(req)}`
    const accountKey = `login:account:${normalizeUsername(username)}`

    // Bloqueio por IP (contém força bruta de um único IP). NÃO bloqueamos por
    // conta antes de autenticar — isso permitiria a um atacante travar a conta
    // da vítima. A credencial correta é verificada abaixo e sempre passa.
    const ipFailures = await failureCount(ipKey)
    if (ipFailures >= IP_FAILURE_THRESHOLD) {
      throw ApiErrors.tooManyRequests(
        'Muitas tentativas malsucedidas deste dispositivo. Aguarde e tente novamente.',
        loginBackoffSeconds(ipFailures - IP_FAILURE_THRESHOLD),
      )
    }

    const user = await authenticateCredentials(username, password)
    if (!user) {
      const [, accountFailures] = await Promise.all([
        registerFailure(ipKey, LOGIN_FAILURE_WINDOW_MS),
        registerFailure(accountKey, LOGIN_FAILURE_WINDOW_MS),
      ])
      // Backoff por conta SÓ em falha (não bloqueia login válido, já resolvido acima):
      // contém força bruta distribuída sobre uma mesma conta.
      if (accountFailures >= ACCOUNT_FAILURE_THRESHOLD) {
        throw ApiErrors.tooManyRequests(
          'Muitas tentativas malsucedidas para esta conta. Aguarde e tente novamente.',
          loginBackoffSeconds(accountFailures - ACCOUNT_FAILURE_THRESHOLD),
        )
      }
      throw ApiErrors.unauthorized('Usuário ou senha inválidos')
    }

    // Sucesso: credencial válida sempre limpa o estado de falhas (IP e conta).
    await Promise.all([clearFailures(ipKey), clearFailures(accountKey)])

    const token = await createUserSession(user.id, req)
    const response = ok({ user })
    response.cookies.set(sessionCookie(token))
    response.cookies.set('biblion_theme', user.accentColor, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return response
  },
  { auth: false, rateLimit: RateLimits.auth },
)
