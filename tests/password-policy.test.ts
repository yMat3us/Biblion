import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { assertStrongPassword } from '@/lib/password-policy'

describe('assertStrongPassword — blocklist local (sempre ativa)', () => {
  it('rejeita senhas notoriamente comuns', async () => {
    await expect(assertStrongPassword('password123')).rejects.toMatchObject({ status: 400 })
    await expect(assertStrongPassword('12345678')).rejects.toMatchObject({ status: 400 })
    await expect(assertStrongPassword('biblion123')).rejects.toMatchObject({ status: 400 })
  })

  it('rejeita caractere único repetido', async () => {
    await expect(assertStrongPassword('aaaaaaaa')).rejects.toMatchObject({ status: 400 })
  })

  it('rejeita senha que contém o nome de usuário', async () => {
    await expect(assertStrongPassword('mateus-forte-92', { username: 'mateus' })).rejects.toMatchObject({ status: 400 })
  })

  it('aceita uma senha forte e sem relação com o usuário', async () => {
    await expect(assertStrongPassword('Tr!lha-Segura-92xQ', { username: 'ana' })).resolves.toBeUndefined()
  })
})

describe('assertStrongPassword — HIBP opcional e fail-open', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('não consulta o HIBP quando PASSWORD_HIBP_CHECK não está ativo', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await assertStrongPassword('Tr!lha-Segura-92xQ')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('bloqueia quando o HIBP reporta a senha como vazada', async () => {
    vi.stubEnv('PASSWORD_HIBP_CHECK', 'true')
    const password = 'Tr!lha-Segura-92xQ'
    const suffix = createHash('sha1').update(password).digest('hex').toUpperCase().slice(5)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(`${suffix}:9\nDEADBEEF:1`, { status: 200 })))
    await expect(assertStrongPassword(password)).rejects.toMatchObject({ status: 400 })
  })

  it('fail-open: erro de rede do HIBP não bloqueia a senha', async () => {
    vi.stubEnv('PASSWORD_HIBP_CHECK', 'true')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede indisponível') }))
    await expect(assertStrongPassword('Tr!lha-Segura-92xQ')).resolves.toBeUndefined()
  })
})
