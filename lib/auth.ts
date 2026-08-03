import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import type { Prisma, UserRole } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { ApiErrors } from '@/lib/http'
import { prisma } from '@/lib/prisma'
import {
  MAX_ACTIVE_SESSIONS,
  SECURE_COOKIES,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_COOKIE,
  SESSION_IDLE_TTL_MS,
} from '@/lib/auth-constants'
import { normalizeUsername, verifyPasswordHash } from '@/lib/password'

export { SESSION_COOKIE } from '@/lib/auth-constants'

// avatarUrl fica FORA deste select de propósito: pode ser um data URL de até
// ~1,5MB e este select é lido em toda requisição autenticada e em cada página
// (resolveSessionToken). Páginas que exibem o avatar o buscam à parte via
// requirePageUserWithAvatar (lib/auth-page.ts).
const AUTH_USER_SELECT = {
  id: true,
  username: true,
  role: true,
  displayName: true,
  bio: true,
  accentColor: true,
  locale: true,
  publicId: true,
  isSearchable: true,
  profileVisibility: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export type AuthUser = Prisma.UserGetPayload<{ select: typeof AUTH_USER_SELECT }>

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function requestUserAgent(req?: NextRequest): string | undefined {
  return req?.headers.get('user-agent')?.slice(0, 500) || undefined
}

/**
 * Assinatura leniente do User-Agent: remove números de versão e normaliza espaços,
 * preservando a estrutura (plataforma/engine/navegador). Assim uma atualização de
 * versão do navegador NÃO invalida a sessão, mas trocar de navegador/dispositivo
 * (sinal de replay de cookie roubado) invalida.
 */
function userAgentSignature(ua: string): string {
  return ua
    .toLowerCase()
    .replace(/[0-9]+(?:[._][0-9]+)*/g, '') // remove tokens de versão (120, 10.0, 17_2…)
    .replace(/\s+/g, ' ')
    .trim()
}

/** true quando ambos os UAs existem e pertencem a famílias diferentes. */
function isUserAgentAnomaly(current: string | null | undefined, stored: string | null | undefined): boolean {
  if (!current || !stored) return false
  return userAgentSignature(current) !== userAgentSignature(stored)
}

export async function authenticateCredentials(username: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { usernameNormalized: normalizeUsername(username) },
    select: { ...AUTH_USER_SELECT, passwordHash: true },
  })

  if (!user) {
    await verifyPasswordHash(password, '')
    return null
  }

  const { passwordHash, ...safeUser } = user
  const passwordValid = await verifyPasswordHash(password, passwordHash)
  if (!user.isActive || !passwordValid) return null

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  return safeUser
}

export async function createUserSession(userId: string, req?: NextRequest): Promise<string> {
  const now = new Date()
  const token = randomBytes(32).toString('base64url')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { authVersion: true, isActive: true },
  })
  if (!user?.isActive) throw ApiErrors.unauthorized()

  await prisma.userSession.deleteMany({
    where: { OR: [{ expiresAt: { lte: now } }, { userId, user: { isActive: false } }] },
  })

  const activeSessions = await prisma.userSession.findMany({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    skip: MAX_ACTIVE_SESSIONS - 1,
    select: { id: true },
  })
  if (activeSessions.length > 0) {
    await prisma.userSession.deleteMany({ where: { id: { in: activeSessions.map(({ id }) => id) } } })
  }

  await prisma.userSession.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      authVersion: user.authVersion,
      userAgent: requestUserAgent(req),
      expiresAt: new Date(Date.now() + SESSION_IDLE_TTL_MS),
    },
  })

  return token
}

export async function resolveSessionToken(
  token: string | null | undefined,
  currentUserAgent?: string | null,
): Promise<AuthUser | null> {
  if (!token || token.length > 200) return null

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      id: true,
      authVersion: true,
      expiresAt: true,
      lastSeenAt: true,
      createdAt: true,
      userAgent: true,
      user: { select: { ...AUTH_USER_SELECT, authVersion: true } },
    },
  })

  if (!session) return null
  const { authVersion, ...safeUser } = session.user
  const now = Date.now()
  const absoluteDeadline = session.createdAt.getTime() + SESSION_ABSOLUTE_TTL_MS
  const invalid =
    !safeUser.isActive ||
    session.authVersion !== authVersion ||
    session.expiresAt.getTime() <= now || // inatividade (janela deslizante)
    absoluteDeadline <= now || // teto absoluto de vida
    isUserAgentAnomaly(currentUserAgent, session.userAgent) // provável replay de token
  if (invalid) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }

  // Desliza a janela de inatividade (limitada pelo teto absoluto), no máximo a cada
  // 5 min para não escrever no banco a cada requisição.
  if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    const slidExpiry = Math.min(now + SESSION_IDLE_TTL_MS, absoluteDeadline)
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(slidExpiry) },
    })
  }

  return safeUser
}

export async function getRequestUser(req: NextRequest): Promise<AuthUser | null> {
  return resolveSessionToken(req.cookies.get(SESSION_COOKIE)?.value, requestUserAgent(req))
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getRequestUser(req)
  if (!user) throw ApiErrors.unauthorized()
  return user
}

export function requireRole(user: AuthUser, ...roles: UserRole[]): void {
  if (!roles.includes(user.role)) throw ApiErrors.forbidden('Você não tem permissão para esta ação')
}

export async function destroySessionToken(token: string | null | undefined): Promise<void> {
  if (!token) return
  await prisma.userSession.deleteMany({ where: { tokenHash: tokenHash(token) } })
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { userId } })
}

/** Metadados seguros de uma sessão — nunca inclui tokenHash, userId ou authVersion. */
export interface SessionSummary {
  id: string
  userAgent: string | null
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
  current: boolean
}

/**
 * Lista as sessões ativas do usuário para a tela "meus dispositivos". O tokenHash
 * é lido só para marcar a sessão atual e é descartado — jamais chega ao client.
 */
export async function listUserSessions(userId: string, currentToken?: string | null): Promise<SessionSummary[]> {
  const currentHash = currentToken ? tokenHash(currentToken) : null
  const sessions = await prisma.userSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
    select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true, tokenHash: true },
  })
  return sessions.map(({ tokenHash: hash, ...rest }) => ({ ...rest, current: hash === currentHash }))
}

const cookieBase = {
  httpOnly: true,
  secure: SECURE_COOKIES,
  sameSite: 'lax' as const,
  path: '/',
  priority: 'high' as const,
}

export function sessionCookie(token: string) {
  // maxAge = teto absoluto: o cookie pode viver até o limite máximo; a expiração
  // por inatividade e o teto são reforçados no servidor (fonte da verdade).
  return { name: SESSION_COOKIE, value: token, ...cookieBase, maxAge: SESSION_ABSOLUTE_TTL_MS / 1000 }
}

export function clearedSessionCookie() {
  return { name: SESSION_COOKIE, value: '', ...cookieBase, maxAge: 0 }
}
