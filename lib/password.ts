import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_N = 32_768
const SCRYPT_R = 8
const SCRYPT_P = 1
const MAX_MEMORY = 64 * 1024 * 1024
const DUMMY_SALT = Buffer.from('biblion-invalid-user-salt-v1', 'utf8')

function derive(password: string, salt: Buffer, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export function normalizeUsername(username: string): string {
  return username.trim().normalize('NFKC').toLocaleLowerCase('pt-BR')
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPasswordHash(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    await derive(password, DUMMY_SALT)
    return false
  }

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts
  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)

  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) {
    await derive(password, DUMMY_SALT)
    return false
  }

  try {
    const expected = Buffer.from(rawKey, 'base64url')
    const actual = await derive(password, Buffer.from(rawSalt, 'base64url'), n, r, p)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    await derive(password, DUMMY_SALT)
    return false
  }
}
