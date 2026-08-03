import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

/**
 * Atribui um publicId único às contas que ainda não possuem um.
 * Idempotente: rodar de novo só cobre contas restantes. Não altera IDs existentes.
 *
 * Uso: node --env-file-if-exists=.env scripts/backfill-public-ids.mjs
 */

const prisma = new PrismaClient()
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const LENGTH = 12

function generatePublicId() {
  const bytes = randomBytes(LENGTH)
  let out = ''
  for (let index = 0; index < LENGTH; index += 1) out += ALPHABET[bytes[index] % ALPHABET.length]
  return out
}

async function uniquePublicId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generatePublicId()
    const existing = await prisma.user.findUnique({ where: { publicId: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  throw new Error('Não foi possível gerar um publicId único')
}

async function main() {
  const pendentes = await prisma.user.findMany({ where: { publicId: null }, select: { id: true } })
  console.log(`[PUBLIC_ID] Contas sem publicId: ${pendentes.length}`)

  let atualizadas = 0
  for (const user of pendentes) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { publicId: await uniquePublicId() } })
      atualizadas += 1
    } catch (error) {
      console.error(`[PUBLIC_ID] Falha na conta ${user.id}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`[PUBLIC_ID] Backfill concluído: ${atualizadas}/${pendentes.length} atualizadas.`)
}

main()
  .catch((error) => {
    console.error('[PUBLIC_ID] Erro:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
