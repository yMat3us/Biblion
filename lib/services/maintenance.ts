import 'server-only'

import { prisma } from '@/lib/prisma'

const DAY_MS = 24 * 60 * 60 * 1000

/** Retenção padrão (dias) antes de expurgar notificações. */
const READ_NOTIFICATION_TTL_DAYS = 30
const ANY_NOTIFICATION_TTL_DAYS = 90

/** Retenção (dias) de eventos de outbox já processados antes do expurgo. */
const PROCESSED_OUTBOX_TTL_DAYS = 7

export interface MaintenanceReport {
  expiredSessions: number
  readNotifications: number
  staleNotifications: number
  processedOutbox: number
}

/**
 * Tarefas de manutenção idempotentes, chamadas pelo cron interno
 * (`app/api/internal/cron`). O servidor já trata expiração de sessão e leitura de
 * notificação como fonte da verdade em tempo de request; estas rotinas apenas
 * impedem o acúmulo indefinido de linhas mortas no banco.
 *
 * Todas aceitam `now` para tornar os testes determinísticos.
 */
export const MaintenanceService = {
  /** Remove sessões já expiradas (janela de inatividade ou teto absoluto). */
  purgeExpiredSessions: async (now = new Date()): Promise<number> => {
    const { count } = await prisma.userSession.deleteMany({ where: { expiresAt: { lte: now } } })
    return count
  },

  /** Remove notificações lidas há mais de `olderThanDays` dias. */
  purgeReadNotifications: async (olderThanDays = READ_NOTIFICATION_TTL_DAYS, now = new Date()): Promise<number> => {
    const cutoff = new Date(now.getTime() - olderThanDays * DAY_MS)
    const { count } = await prisma.notification.deleteMany({
      where: { readAt: { not: null, lte: cutoff } },
    })
    return count
  },

  /**
   * Teto de retenção: remove qualquer notificação (lida ou não) mais antiga que
   * `olderThanDays`. Evita que notificações nunca abertas fiquem para sempre.
   */
  purgeStaleNotifications: async (olderThanDays = ANY_NOTIFICATION_TTL_DAYS, now = new Date()): Promise<number> => {
    const cutoff = new Date(now.getTime() - olderThanDays * DAY_MS)
    const { count } = await prisma.notification.deleteMany({ where: { createdAt: { lte: cutoff } } })
    return count
  },

  /** Remove eventos de outbox já PROCESSED há mais de `olderThanDays` dias. */
  purgeProcessedOutbox: async (olderThanDays = PROCESSED_OUTBOX_TTL_DAYS, now = new Date()): Promise<number> => {
    const cutoff = new Date(now.getTime() - olderThanDays * DAY_MS)
    const { count } = await prisma.outboxEvent.deleteMany({
      where: { status: 'PROCESSED', processedAt: { lte: cutoff } },
    })
    return count
  },

  /** Executa todas as rotinas de manutenção e devolve um relatório de contagens. */
  runAll: async (now = new Date()): Promise<MaintenanceReport> => {
    // Sequencial de propósito: mantém a carga previsível e o log de contagens
    // simples de auditar. O volume aqui é pequeno (limpeza, não caminho quente).
    const expiredSessions = await MaintenanceService.purgeExpiredSessions(now)
    const readNotifications = await MaintenanceService.purgeReadNotifications(READ_NOTIFICATION_TTL_DAYS, now)
    const staleNotifications = await MaintenanceService.purgeStaleNotifications(ANY_NOTIFICATION_TTL_DAYS, now)
    const processedOutbox = await MaintenanceService.purgeProcessedOutbox(PROCESSED_OUTBOX_TTL_DAYS, now)
    return { expiredSessions, readNotifications, staleNotifications, processedOutbox }
  },
}
