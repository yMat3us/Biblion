import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  userSession: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn() },
  outboxEvent: { deleteMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { MaintenanceService } from '@/lib/services/maintenance'

describe('MaintenanceService — expurgo idempotente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.userSession.deleteMany.mockResolvedValue({ count: 0 })
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 })
    prisma.outboxEvent.deleteMany.mockResolvedValue({ count: 0 })
  })

  it('purga sessões já expiradas (expiresAt <= agora)', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z')
    prisma.userSession.deleteMany.mockResolvedValueOnce({ count: 7 })

    const removed = await MaintenanceService.purgeExpiredSessions(now)

    expect(removed).toBe(7)
    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: now } } })
  })

  it('purga notificações lidas além da janela de retenção', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z')
    prisma.notification.deleteMany.mockResolvedValueOnce({ count: 3 })

    const removed = await MaintenanceService.purgeReadNotifications(30, now)

    expect(removed).toBe(3)
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({ where: { readAt: { not: null, lte: cutoff } } })
  })

  it('purga qualquer notificação além do teto de retenção (lida ou não)', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z')
    prisma.notification.deleteMany.mockResolvedValueOnce({ count: 2 })

    const removed = await MaintenanceService.purgeStaleNotifications(90, now)

    expect(removed).toBe(2)
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lte: cutoff } } })
  })

  it('purga eventos de outbox já processados além da retenção', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z')
    prisma.outboxEvent.deleteMany.mockResolvedValueOnce({ count: 9 })

    const removed = await MaintenanceService.purgeProcessedOutbox(7, now)

    expect(removed).toBe(9)
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    expect(prisma.outboxEvent.deleteMany).toHaveBeenCalledWith({
      where: { status: 'PROCESSED', processedAt: { lte: cutoff } },
    })
  })

  it('runAll agrega as contagens de cada rotina', async () => {
    const now = new Date('2026-07-22T00:00:00.000Z')
    prisma.userSession.deleteMany.mockResolvedValueOnce({ count: 5 })
    prisma.notification.deleteMany
      .mockResolvedValueOnce({ count: 4 }) // read
      .mockResolvedValueOnce({ count: 1 }) // stale
    prisma.outboxEvent.deleteMany.mockResolvedValueOnce({ count: 2 })

    const report = await MaintenanceService.runAll(now)

    expect(report).toEqual({ expiredSessions: 5, readNotifications: 4, staleNotifications: 1, processedOutbox: 2 })
  })
})
