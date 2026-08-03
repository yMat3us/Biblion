import 'server-only'

import { after } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { NotificationService } from '@/lib/services/notification'
import { bus } from '@/lib/events/bus'
import type { DomainEvent, DomainEventType } from '@/lib/events/types'

// Reserva de processamento: por quanto tempo um evento reivindicado fica invisível
// a outros processadores. Se quem reivindicou morrer, o evento volta a ficar
// elegível após esse prazo (entrega ao-menos-uma-vez, sem estado PROCESSING preso).
const VISIBILITY_MS = 60_000
// Tentativas totais antes de marcar como FAILED (evita retentativa infinita).
const MAX_ATTEMPTS = 6
const BASE_BACKOFF_MS = 30_000
const MAX_BACKOFF_MS = 30 * 60_000

/** Backoff exponencial por tentativa: 30s, 60s, 120s… saturando em 30min. */
function backoffMs(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS)
}

function parseEvent(payload: string): DomainEvent {
  return JSON.parse(payload) as DomainEvent
}

/**
 * Entrega de um evento: cria a(s) notificação(ões) correspondente(s). Lança em
 * caso de falha para que o processador reentregue com backoff. É aqui que, na
 * Etapa 3.3, o fan-out em tempo real (SSE/pub-sub) será publicado.
 */
function realtimePayload(event: DomainEvent): { type: DomainEventType; conversationId?: string } {
  return event.type === 'message.sent'
    ? { type: event.type, conversationId: event.conversationId }
    : { type: event.type }
}

async function handleEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case 'friend.requested':
      await NotificationService.createFriendRequest(event.recipientId, event.actorId)
      break
    case 'friend.accepted':
      await NotificationService.createFriendAccepted(event.recipientId, event.actorId)
      break
    case 'message.sent':
      await NotificationService.createMessage(event.recipientId, event.actorId, event.conversationId)
      break
  }
  // Fan-out em tempo real para o stream SSE do destinatário. bus.publish é
  // best-effort (não relança), então não provoca retentativa do outbox.
  await bus.publish(`user:${event.recipientId}`, realtimePayload(event))
}

/**
 * Grava o evento no outbox. Insere no `tx` quando fornecido — permitindo que o
 * chamador o torne parte da MESMA transação da mudança de domínio (garantia
 * transacional forte). Sem `tx`, é um insert autônomo. Lança em caso de falha.
 */
export async function enqueue(event: DomainEvent, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma
  await client.outboxEvent.create({ data: { type: event.type, payload: JSON.stringify(event) } })
}

function scheduleImmediateDelivery(): void {
  try {
    // Entrega logo após a resposta, sem bloquear o request. Fora de um contexto de
    // request (cron, scripts, testes), after() lança — e a entrega fica a cargo do cron.
    after(() => {
      void processPending().catch((error) => logger.error('outbox_after_process_failed', { error }))
    })
  } catch {
    // Sem contexto de request: ignorado de propósito (o cron reentrega).
  }
}

/**
 * Emite um evento de domínio. Best-effort no boundary: a ação já foi cometida, então
 * uma falha ao enfileirar NUNCA derruba a resposta (degrada ao comportamento antigo
 * de notificação best-effort). O `await` cobre apenas o insert rápido (durabilidade
 * dentro do request); a entrega em si roda fora do caminho crítico via after() + cron.
 */
export async function emit(event: DomainEvent): Promise<void> {
  try {
    await enqueue(event)
  } catch (error) {
    logger.error('outbox_enqueue_failed', { type: event.type, error })
    return
  }
  scheduleImmediateDelivery()
}

/**
 * Processa eventos pendentes já vencidos. Reivindica cada um atomicamente
 * (updateMany condicionado a status+nextAttemptAt), entrega, e marca PROCESSED
 * ou reprograma com backoff — FAILED após MAX_ATTEMPTS. Chamado pelo after()
 * (entrega imediata) e pelo cron interno (retentativa/durabilidade).
 */
export async function processPending(
  limit = 20,
  now = new Date(),
): Promise<{ processed: number; failed: number; retried: number }> {
  const candidates = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })

  let processed = 0
  let failed = 0
  let retried = 0

  for (const { id } of candidates) {
    // Reivindicação atômica: incrementa attempts e empurra nextAttemptAt para o
    // futuro (janela de visibilidade). Se outro processador já reivindicou, count=0.
    const claim = await prisma.outboxEvent.updateMany({
      where: { id, status: 'PENDING', nextAttemptAt: { lte: now } },
      data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + VISIBILITY_MS) },
    })
    if (claim.count !== 1) continue

    const row = await prisma.outboxEvent.findUnique({
      where: { id },
      select: { id: true, payload: true, type: true, attempts: true },
    })
    if (!row) continue

    try {
      await handleEvent(parseEvent(row.payload))
      await prisma.outboxEvent.update({
        where: { id },
        data: { status: 'PROCESSED', processedAt: new Date(), lastError: null },
      })
      processed += 1
    } catch (error) {
      const permanent = row.attempts >= MAX_ATTEMPTS
      await prisma.outboxEvent.update({
        where: { id },
        data: {
          status: permanent ? 'FAILED' : 'PENDING',
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, 500),
          nextAttemptAt: new Date(now.getTime() + backoffMs(row.attempts)),
        },
      })
      logger.error('outbox_event_failed', { type: row.type, attempts: row.attempts, permanent, error })
      if (permanent) failed += 1
      else retried += 1
    }
  }

  return { processed, failed, retried }
}

/** Fachada dos eventos de domínio para os serviços. */
export const Events = { emit, enqueue, processPending }
