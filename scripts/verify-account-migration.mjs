import { scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()
const KEY_LENGTH = 64
const MAX_MEMORY = 64 * 1024 * 1024

function normalizeUsername(value) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR')
}

function derive(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, rawN, rawR, rawP, rawSalt, rawKey, ...extra] = encodedHash.split('$')
  if (algorithm !== 'scrypt' || extra.length > 0) return false
  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (n !== 32_768 || r !== 8 || p !== 1 || !rawSalt || !rawKey) return false

  try {
    const expected = Buffer.from(rawKey, 'base64url')
    const actual = await derive(password, Buffer.from(rawSalt, 'base64url'), n, r, p)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

async function main() {
  const username = process.env.OWNER_USERNAME?.trim()
  const password = process.env.OWNER_PASSWORD
  const requireAllDataTarget = process.env.REQUIRE_ALL_DATA_TARGET === 'true'
  if (!username) throw new Error('Defina OWNER_USERNAME para verificar a migração')

  const owner = await prisma.user.findUnique({
    where: { usernameNormalized: normalizeUsername(username) },
  })
  if (!owner) throw new Error('A conta owner alvo não existe')
  if (owner.role !== UserRole.OWNER || !owner.isActive) {
    throw new Error('A conta alvo não está ativa com cargo OWNER')
  }
  if (password && !(await verifyPassword(password, owner.passwordHash))) {
    throw new Error('A credencial fornecida não corresponde ao hash persistido')
  }

  const users = await prisma.user.findMany({ select: { id: true } })
  const validOwnerIds = new Set(users.map(({ id }) => id))
  const models = [
    ['sermões', prisma.sermao],
    ['esboços', prisma.esboco],
    ['anotações', prisma.anotacao],
    ['favoritos', prisma.favorito],
    ['revistas EBD', prisma.revistaEBD],
    ['lições EBD', prisma.licaoEBD],
    ['configurações', prisma.configuracao],
  ]

  for (const [label, model] of models) {
    const records = await model.findMany({ select: { ownerId: true } })
    const missing = records.filter(({ ownerId }) => !ownerId).length
    const target = records.filter(({ ownerId }) => ownerId === owner.id).length
    const orphaned = records.filter(({ ownerId }) => ownerId && !validOwnerIds.has(ownerId)).length
    const other = records.length - missing - target

    if (missing > 0) throw new Error(`${label}: ${missing} documento(s) ainda estão sem owner`)
    if (orphaned > 0) throw new Error(`${label}: ${orphaned} documento(s) apontam para owner inexistente`)
    if (requireAllDataTarget && other > 0) {
      throw new Error(`${label}: ${other} documento(s) não pertencem à conta alvo`)
    }
    console.log(`${label}: total=${records.length}; owner alvo=${target}; outros owners válidos=${other}.`)
  }

  const linkedLessons = await prisma.licaoEBD.findMany({
    where: { revistaId: { not: null } },
    select: { ownerId: true, revista: { select: { ownerId: true } } },
  })
  const invalidLessons = linkedLessons.filter((lesson) => !lesson.revista || lesson.ownerId !== lesson.revista.ownerId)
  if (invalidLessons.length > 0) {
    throw new Error(`${invalidLessons.length} lição(ões) possuem vínculo de revista entre owners diferentes`)
  }

  const configurations = await prisma.configuracao.findMany({ select: { ownerId: true, chave: true } })
  const configurationKeys = new Set()
  for (const configuration of configurations) {
    const compoundKey = `${configuration.ownerId}:${configuration.chave}`
    if (configurationKeys.has(compoundKey)) throw new Error(`Configuração duplicada: ${configuration.chave}`)
    configurationKeys.add(compoundKey)
  }

  console.log(`Owner validado: cargo=${owner.role}; ativo=${owner.isActive}; credencial=${password ? 'válida' : 'não testada'}.`)
  console.log(`Vínculos EBD válidos: ${linkedLessons.length}; configurações únicas: ${configurations.length}.`)
  console.log('Verificação independente da migração concluída com sucesso.')
}

main()
  .catch((error) => {
    console.error('Falha na verificação da migração:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
