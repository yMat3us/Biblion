import { describe, expect, it } from 'vitest'
import { hashPassword, normalizeUsername, verifyPasswordHash } from '@/lib/password'

describe('password security', () => {
  it('normalizes usernames consistently with NFKC and case folding', () => {
    expect(normalizeUsername('  YＭat3us_  ')).toBe('ymat3us_')
  })

  it('creates a versioned scrypt hash with a random salt', async () => {
    const first = await hashPassword('Uma senha forte 123!')
    const second = await hashPassword('Uma senha forte 123!')

    expect(first).toMatch(/^scrypt\$32768\$8\$1\$[^$]+\$[^$]+$/)
    expect(second).not.toBe(first)
  })

  it('accepts the correct password and rejects a different one', async () => {
    const hash = await hashPassword('Senha correta 123!')

    await expect(verifyPasswordHash('Senha correta 123!', hash)).resolves.toBe(true)
    await expect(verifyPasswordHash('Senha incorreta 123!', hash)).resolves.toBe(false)
  })

  it('fails closed for malformed or unsupported hashes', async () => {
    await expect(verifyPasswordHash('qualquer senha', 'not-a-hash')).resolves.toBe(false)
    await expect(
      verifyPasswordHash('qualquer senha', 'scrypt$16384$8$1$c2FsdA$a2V5'),
    ).resolves.toBe(false)
  })
})
