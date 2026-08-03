import 'server-only'

import { prisma } from '@/lib/prisma'
import { ingestDataUrlToStorage, storageConfigured } from '@/lib/storage'
import { logger } from '@/lib/logger'

export interface AvatarMigrationReport {
  configured: boolean
  scanned: number
  migrated: number
  remaining: number
}

/**
 * Migra avatares base64 (data URL) legados para o object storage, em lote e de
 * forma idempotente (processa só os que ainda são data URL). Requer storage
 * configurado. Reusa lib/storage — sem duplicar assinatura. Chamado por
 * app/api/internal/migrate-avatars, guardado por CRON_SECRET; chame em loop até
 * `remaining` chegar a 0.
 */
export async function migrateBase64Avatars(limit = 50): Promise<AvatarMigrationReport> {
  if (!storageConfigured()) return { configured: false, scanned: 0, migrated: 0, remaining: 0 }

  const users = await prisma.user.findMany({
    where: { avatarUrl: { startsWith: 'data:' } },
    take: limit,
    select: { id: true, avatarUrl: true },
  })

  let migrated = 0
  for (const user of users) {
    if (!user.avatarUrl) continue
    const hosted = await ingestDataUrlToStorage(user.avatarUrl, user.id)
    if (!hosted) continue
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: hosted } })
    migrated += 1
  }

  const remaining = await prisma.user.count({ where: { avatarUrl: { startsWith: 'data:' } } })
  logger.info('avatar_migration_batch', { scanned: users.length, migrated, remaining })
  return { configured: true, scanned: users.length, migrated, remaining }
}
