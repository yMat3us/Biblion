import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import type { Prisma, UserRole } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { ApiErrors } from '@/lib/http'
import { prisma } from '@/lib/prisma'
import { MAX_ACTIVE_SESSIONS, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth-constants'
import { normalizeUsername, verifyPasswordHash } from '@/lib/password'

export { SESSION_COOKIE } from '@/lib/auth-constants'

const AUTH_USER_SELECT = {
  id: true,
  username: true,
  role: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  accentColor: true,
  locale: true,
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
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  })

  return token
}

export async function resolveSessionToken(token: string | null | undefined): Promise<AuthUser | null> {
  if (!token || token.length > 200) return null

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      id: true,
      authVersion: true,
      expiresAt: true,
      lastSeenAt: true,
      user: { select: { ...AUTH_USER_SELECT, authVersion: true } },
    },
  })

  if (!session) return null
  const { authVersion, ...safeUser } = session.user
  const invalid =
    !safeUser.isActive ||
    session.authVersion !== authVersion ||
    session.expiresAt.getTime() <= Date.now()
  if (invalid) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }

  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })
  }

  return safeUser
}

export async function getRequestUser(req: NextRequest): Promise<AuthUser | null> {
  return resolveSessionToken(req.cookies.get(SESSION_COOKIE)?.value)
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const secureCookie = siteUrl
  ? siteUrl.startsWith('https://')
  : process.env.NODE_ENV === 'production'

const cookieBase = {
  httpOnly: true,
  secure: secureCookie,
  sameSite: 'lax' as const,
  path: '/',
  priority: 'high' as const,
}

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, ...cookieBase, maxAge: SESSION_TTL_MS / 1000 }
}

export function clearedSessionCookie() {
  return { name: SESSION_COOKIE, value: '', ...cookieBase, maxAge: 0 }
}
