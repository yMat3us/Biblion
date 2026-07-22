import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I) para IDs fáceis de ler e ditar.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const LENGTH = 12

/** Gera um código público aleatório (~59 bits de entropia). */
export function generatePublicId(): string {
  const bytes = randomBytes(LENGTH)
  let out = ''
  for (let index = 0; index < LENGTH; index += 1) {
    out += ALPHABET[bytes[index] % ALPHABET.length]
  }
  return out
}

/** Gera um publicId garantindo unicidade no banco (colisão é astronomicamente rara). */
export async function ensureUniquePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generatePublicId()
    const existing = await prisma.user.findUnique({ where: { publicId: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  throw new Error('Não foi possível gerar um identificador público único')
}

/** Backfill preguiçoso: garante que a conta tenha um publicId, criando um se faltar. */
export async function ensurePublicId(userId: string, current: string | null): Promise<string> {
  if (current) return current
  const publicId = await ensureUniquePublicId()
  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: { publicId }, select: { publicId: true } })
    return updated.publicId ?? publicId
  } catch {
    const fresh = await prisma.user.findUnique({ where: { id: userId }, select: { publicId: true } })
    return fresh?.publicId ?? publicId
  }
}
