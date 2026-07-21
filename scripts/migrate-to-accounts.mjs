import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()
const KEY_LENGTH = 64
const SCRYPT_N = 32_768
const SCRYPT_R = 8
const SCRYPT_P = 1
const NEW_OWNER_MARKER = '__new_owner__'

function normalizeUsername(value) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR')
}

function derive(password, salt, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, rawN, rawR, rawP, rawSalt, rawKey, ...extra] = encodedHash.split('$')
  const n = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (algorithm !== 'scrypt' || extra.length > 0 || n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false

  try {
    const expected = Buffer.from(rawKey, 'base64url')
    const actual = await derive(password, Buffer.from(rawSalt, 'base64url'), n, r, p)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

function requireExecutionMode() {
  const dryRun = process.env.DRY_RUN === 'true'
  const apply = process.env.APPLY_MIGRATION === 'true'
  if (dryRun === apply) {
    throw new Error('Defina exatamente um modo: DRY_RUN=true ou APPLY_MIGRATION=true')
  }
  return { dryRun }
}

function objectIdValue(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof value.$oid === 'string') return value.$oid
  return null
}

async function rawAggregate(collection, pipeline) {
  const result = await prisma.$runCommandRaw({
    aggregate: collection,
    pipeline,
    cursor: { batchSize: 100_000 },
  })
  const batch = result.cursor?.firstBatch
  if (!Array.isArray(batch)) throw new Error(`Resposta de agregação inválida para ${collection}`)
  return batch
}

async function countLegacy(collection) {
  const result = await prisma.$runCommandRaw({ count: collection, query: { ownerId: null } })
  return Number(result.n ?? 0)
}

async function backfillLegacy(collection, ownerId) {
  const result = await prisma.$runCommandRaw({
    update: collection,
    updates: [{
      q: { ownerId: null },
      u: { $set: { ownerId: { $oid: ownerId } } },
      multi: true,
    }],
  })
  if (Number(result.ok) !== 1) throw new Error(`MongoDB rejeitou o backfill da coleção ${collection}`)
  return Number(result.nModified ?? result.n ?? 0)
}

async function assertNoConfigurationConflicts(ownerId) {
  const legacy = await rawAggregate('Configuracao', [
    { $match: { ownerId: null } },
    { $project: { _id: 0, chave: 1 } },
  ])
  const legacyKeys = new Set()
  for (const document of legacy) {
    const key = typeof document.chave === 'string' ? document.chave : ''
    if (!key) throw new Error('Há uma configuração legada sem chave válida')
    if (legacyKeys.has(key)) throw new Error(`Há mais de uma configuração legada com a chave "${key}"`)
    legacyKeys.add(key)
  }

  if (!ownerId || legacyKeys.size === 0) return
  const existing = await prisma.configuracao.findMany({
    where: { ownerId, chave: { in: [...legacyKeys] } },
    select: { chave: true },
  })
  if (existing.length > 0) {
    throw new Error(`Conflito de configuração para o owner: ${existing.map(({ chave }) => chave).join(', ')}`)
  }
}

async function countInvalidEbdLinks(fallbackOwnerId) {
  const lessons = await rawAggregate('LicaoEBD', [
    { $match: { revistaId: { $ne: null } } },
    {
      $lookup: {
        from: 'RevistaEBD',
        localField: 'revistaId',
        foreignField: '_id',
        as: 'revista',
      },
    },
    {
      $project: {
        _id: 0,
        ownerId: 1,
        revistaCount: { $size: '$revista' },
        revistaOwnerIds: '$revista.ownerId',
      },
    },
  ])

  return lessons.filter((lesson) => {
    if (Number(lesson.revistaCount) !== 1) return true
    const lessonOwner = objectIdValue(lesson.ownerId) ?? fallbackOwnerId
    const rawMagazineOwners = Array.isArray(lesson.revistaOwnerIds) ? lesson.revistaOwnerIds : []
    const magazineOwner = objectIdValue(rawMagazineOwners[0]) ?? fallbackOwnerId
    return !lessonOwner || !magazineOwner || lessonOwner !== magazineOwner
  }).length
}

async function assertNoOrphanedOwners(models) {
  const users = await prisma.user.findMany({ select: { id: true } })
  const validOwnerIds = new Set(users.map(({ id }) => id))

  for (const { label, collection } of models) {
    const records = await rawAggregate(collection, [{ $project: { _id: 0, ownerId: 1 } }])
    const orphaned = records.filter((record) => {
      const ownerId = objectIdValue(record.ownerId)
      return ownerId && !validOwnerIds.has(ownerId)
    })
    if (orphaned.length > 0) {
      throw new Error(`${label}: ${orphaned.length} documento(s) referenciam owner inexistente`)
    }
  }
}

async function assertFinalIntegrity(models) {
  const remaining = {}
  for (const { label, collection } of models) remaining[label] = await countLegacy(collection)
  const totalRemaining = Object.values(remaining).reduce((sum, value) => sum + value, 0)
  if (totalRemaining !== 0) throw new Error(`Backfill incompleto: ${JSON.stringify(remaining)}`)

  const invalidLinks = await countInvalidEbdLinks(null)
  if (invalidLinks > 0) {
    throw new Error(`Integridade EBD inválida após backfill: ${invalidLinks} vínculo(s) inconsistente(s)`)
  }
}

async function main() {
  const username = process.env.OWNER_USERNAME?.trim()
  const password = process.env.OWNER_PASSWORD
  const { dryRun } = requireExecutionMode()
  const resetPassword = process.env.RESET_OWNER_PASSWORD === 'true'

  if (!username || !password) {
    throw new Error('Defina OWNER_USERNAME e OWNER_PASSWORD apenas no ambiente da execução')
  }
  if (password.length < 8) throw new Error('OWNER_PASSWORD deve ter pelo menos 8 caracteres')

  const models = [
    { label: 'sermões', collection: 'Sermao', delegate: prisma.sermao },
    { label: 'esboços', collection: 'Esboco', delegate: prisma.esboco },
    { label: 'anotações', collection: 'Anotacao', delegate: prisma.anotacao },
    { label: 'favoritos', collection: 'Favorito', delegate: prisma.favorito },
    { label: 'revistas EBD', collection: 'RevistaEBD', delegate: prisma.revistaEBD },
    { label: 'lições EBD', collection: 'LicaoEBD', delegate: prisma.licaoEBD },
    { label: 'configurações', collection: 'Configuracao', delegate: prisma.configuracao },
  ]

  const normalized = normalizeUsername(username)
  let owner = await prisma.user.findUnique({ where: { usernameNormalized: normalized } })
  const predictedOwnerId = owner?.id ?? NEW_OWNER_MARKER

  await assertNoOrphanedOwners(models)
  await assertNoConfigurationConflicts(owner?.id)
  const predictedInvalidLinks = await countInvalidEbdLinks(predictedOwnerId)
  if (predictedInvalidLinks > 0) {
    throw new Error(`Preflight EBD falhou: ${predictedInvalidLinks} lição(ões) ficariam ligadas a revista de outro owner`)
  }
  if (owner && !resetPassword && !(await verifyPassword(password, owner.passwordHash))) {
    throw new Error('A conta alvo existe, mas a senha fornecida não confere; use RESET_OWNER_PASSWORD=true para redefini-la')
  }

  console.log(dryRun ? '[dry-run] Nenhuma escrita será executada.' : '[apply] Iniciando migração idempotente.')
  console.log(owner
    ? `Conta alvo existente; será garantida como ${UserRole.OWNER} ativa${resetPassword ? ' e terá a senha redefinida' : ''}.`
    : `Conta alvo será criada como ${UserRole.OWNER} ativa.`)

  for (const { label, collection, delegate } of models) {
    const total = await delegate.count()
    const legacy = await countLegacy(collection)
    const alreadyTarget = owner ? await delegate.count({ where: { ownerId: owner.id } }) : 0
    console.log(`${label}: total=${total}; sem owner=${legacy}; já vinculados ao alvo=${alreadyTarget}.`)
  }

  if (dryRun) {
    console.log('[dry-run] Preflight concluído sem conflitos. Execute novamente com APPLY_MIGRATION=true para aplicar.')
    return
  }

  if (!owner) {
    owner = await prisma.user.create({
      data: {
        username,
        usernameNormalized: normalized,
        passwordHash: await hashPassword(password),
        displayName: username,
        role: UserRole.OWNER,
        isActive: true,
      },
    })
    console.log('Owner criado com sucesso.')
  } else {
    owner = await prisma.user.update({
      where: { id: owner.id },
      data: {
        role: UserRole.OWNER,
        isActive: true,
        passwordHash: resetPassword ? await hashPassword(password) : undefined,
        authVersion: resetPassword ? { increment: 1 } : owner.authVersion,
      },
    })
    if (resetPassword) await prisma.userSession.deleteMany({ where: { userId: owner.id } })
    console.log('Owner existente validado como OWNER ativo.')
  }

  for (const { label, collection } of models) {
    const changed = await backfillLegacy(collection, owner.id)
    console.log(`${label}: ${changed} documento(s) legado(s) vinculado(s).`)
  }

  await assertFinalIntegrity(models)
  await assertNoOrphanedOwners(models)

  const ownerSummary = await prisma.user.findUnique({
    where: { id: owner.id },
    select: { role: true, isActive: true, passwordHash: true },
  })
  if (!ownerSummary || ownerSummary.role !== UserRole.OWNER || !ownerSummary.isActive) {
    throw new Error('A conta alvo não terminou a migração como OWNER ativo')
  }
  if (!(await verifyPassword(password, ownerSummary.passwordHash))) {
    throw new Error('A credencial fornecida não corresponde ao hash final da conta owner')
  }

  console.log('Migração validada: owner ativo, credencial válida, nenhum documento sem owner e vínculos EBD íntegros.')
}

main()
  .catch((error) => {
    console.error('Falha na migração de contas:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
