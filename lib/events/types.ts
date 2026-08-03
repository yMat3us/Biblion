/**
 * Eventos de domínio publicados via outbox. São gravados como uma linha
 * OutboxEvent (type + payload JSON) e entregues por um processador. Manter a
 * união discriminada aqui garante tipagem de ponta a ponta entre quem emite
 * (services) e quem consome (handlers do outbox / bus de tempo real).
 */
export type DomainEvent =
  | { type: 'friend.requested'; recipientId: string; actorId: string }
  | { type: 'friend.accepted'; recipientId: string; actorId: string }
  | { type: 'message.sent'; recipientId: string; actorId: string; conversationId: string }

export type DomainEventType = DomainEvent['type']

/** Destinatário do evento — usado para o fan-out em tempo real (canal por usuário). */
export function recipientOf(event: DomainEvent): string {
  return event.recipientId
}
