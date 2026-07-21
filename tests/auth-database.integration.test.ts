import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as login } from '@/app/api/auth/login/route'
import { GET as me } from '@/app/api/auth/me/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { GET as listAccounts } from '@/app/api/accounts/route'
import { destroySessionToken } from '@/lib/auth'
import { RevistaService } from '@/lib/services/ebd'
import { SermaoService } from '@/lib/services/sermao'

const databaseSuite = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip
const baseUrl = 'http://localhost:3000'

databaseSuite('database-backed authentication smoke test', () => {
  it('logs in, authorizes owner data, and revokes the session on logout', async () => {
    const username = process.env.TEST_OWNER_USERNAME
    const password = process.env.TEST_OWNER_PASSWORD
    if (!username || !password) throw new Error('Defina TEST_OWNER_USERNAME e TEST_OWNER_PASSWORD')

    let token: string | undefined
    try {
      const loginRequest = new NextRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: baseUrl,
          'sec-fetch-site': 'same-origin',
          'user-agent': 'biblion-integration-test',
        },
        body: JSON.stringify({ username, password }),
      })
      const loginResponse = await login(loginRequest, undefined)
      expect(loginResponse.status).toBe(200)

      const loginBody = await loginResponse.json() as {
        user: { id: string; username: string; role: string; isActive: boolean }
      }
      expect(loginBody.user).toMatchObject({ username, role: 'OWNER', isActive: true })

      const setCookie = loginResponse.headers.get('set-cookie')
      expect(setCookie).toContain('biblion_session=')
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=lax')
      const cookie = setCookie?.split(';', 1)[0]
      if (!cookie) throw new Error('Cookie de sessão não retornado')
      token = cookie.slice(cookie.indexOf('=') + 1)

      const meResponse = await me(new NextRequest(`${baseUrl}/api/auth/me`, {
        headers: { cookie },
      }), undefined)
      expect(meResponse.status).toBe(200)
      await expect(meResponse.json()).resolves.toMatchObject({
        user: { id: loginBody.user.id, role: 'OWNER' },
      })

      const accountsResponse = await listAccounts(new NextRequest(`${baseUrl}/api/accounts`, {
        headers: { cookie },
      }), undefined)
      expect(accountsResponse.status).toBe(200)
      const accounts = await accountsResponse.json() as Array<Record<string, unknown>>
      expect(accounts.some((account) => account.id === loginBody.user.id)).toBe(true)
      expect(accounts.every((account) => !('passwordHash' in account))).toBe(true)

      const sermons = await SermaoService.list(loginBody.user.id)
      const magazines = await RevistaService.list(loginBody.user.id)
      expect(sermons.length).toBeGreaterThan(0)
      expect(magazines.length).toBeGreaterThan(0)
      await expect(SermaoService.list('000000000000000000000000')).resolves.toHaveLength(0)
      await expect(RevistaService.list('000000000000000000000000')).resolves.toHaveLength(0)

      const logoutRequest = new NextRequest(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          cookie,
          origin: baseUrl,
          'sec-fetch-site': 'same-origin',
        },
      })
      const logoutResponse = await logout(logoutRequest, undefined)
      expect(logoutResponse.status).toBe(200)
      expect(logoutResponse.headers.get('Clear-Site-Data')).toBeNull()
      expect(logoutResponse.headers.get('set-cookie')).toContain('Max-Age=0')

      const revokedResponse = await me(new NextRequest(`${baseUrl}/api/auth/me`, {
        headers: { cookie },
      }), undefined)
      expect(revokedResponse.status).toBe(401)
      await expect(revokedResponse.json()).resolves.toMatchObject({
        error: { code: 'UNAUTHORIZED' },
      })
    } finally {
      if (token) await destroySessionToken(token)
    }
  })
})
