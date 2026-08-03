import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  outboxEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}))

const notification = vi.hoisted(() => ({
  createFriendRequest: vi.fn(),
  createFriendAccepted: vi.fn(),
  createMessage: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma }))
vi.mock('@/lib/services/notification', () => ({ NotificationService: notification }))
vi.mock('next/server', () => ({ after: vi.fn() }))

import { after } from 'next/server'
import { emit, enqueue, processPending } from '@/lib/events/outbox'

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    type: 'friend.requested',
    payload: JSON.stringify({ type: 'friend.requested', recipientId: 'bob', actorId: 'alice' }),
    attempts: 1,
    ...overrides,
  }
}

describe('outbox — enqueue e emit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.outboxEvent.create.mockResolvedValue({ id: 'e1' })
  })

  it('enqueue grava tipo + payload JSON do evento', async () => {
    await enqueue({ type: 'friend.requested', recipientId: 'bob', actorId: 'alice' })

    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        type: 'friend.requested',
        payload: JSON.stringify({ type: 'friend.requested', recipientId: 'bob', actorId: 'alice' }),
      },
    })
  })

  it('emit enfileira e agenda entrega imediata (after)', async () => {
    await emit({ type: 'message.sent', recipientId: 'bob', actorId: 'alice', conversationId: 'c1' })

    expect(prisma.outboxEvent.create).toHaveBeenCalled()
    expect(after).toHaveBeenCalledOnce()
  })

  it('emit é best-effort: não lança nem agenda se o enqueue falhar', async () => {
    prisma.outboxEvent.create.mockRejectedValueOnce(new Error('mongo down'))

    await expect(emit({ type: 'friend.accepted', recipientId: 'bob', actorId: 'alice' })).resolves.toBeUndefined()
    expect(after).not.toHaveBeenCalled()
  })
})

describe('outbox — processPending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 })
    prisma.outboxEvent.update.mockResolvedValue({})
  })

  it('reivindica, entrega ao handler certo e marca PROCESSED', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'e1' }])
    prisma.outboxEvent.findUnique.mockResolvedValueOnce(eventRow())
    notification.createFriendRequest.mockResolvedValueOnce(undefined)

    const result = await processPending(10, new Date('2026-07-22T00:00:00.000Z'))

    expect(notification.createFriendRequest).toHaveBeenCalledWith('bob', 'alice')
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' }, data: expect.objectContaining({ status: 'PROCESSED' }) }),
    )
    expect(result).toEqual({ processed: 1, failed: 0, retried: 0 })
  })

  it('pula o evento quando outro processador já o reivindicou (claim count=0)', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'e1' }])
    prisma.outboxEvent.updateMany.mockResolvedValueOnce({ count: 0 })

    const result = await processPending()

    expect(prisma.outboxEvent.findUnique).not.toHaveBeenCalled()
    expect(notification.createFriendRequest).not.toHaveBeenCalled()
    expect(result).toEqual({ processed: 0, failed: 0, retried: 0 })
  })

  it('reprograma com backoff (segue PENDING) quando o handler falha sem esgotar tentativas', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'e1' }])
    prisma.outboxEvent.findUnique.mockResolvedValueOnce(eventRow({ attempts: 2 }))
    notification.createFriendRequest.mockRejectedValueOnce(new Error('falha transitória'))

    const result = await processPending()

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' }, data: expect.objectContaining({ status: 'PENDING' }) }),
    )
    expect(result).toEqual({ processed: 0, failed: 0, retried: 1 })
  })

  it('marca FAILED quando o handler falha e as tentativas esgotaram', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'e1' }])
    prisma.outboxEvent.findUnique.mockResolvedValueOnce(eventRow({ attempts: 6 }))
    notification.createFriendRequest.mockRejectedValueOnce(new Error('falha permanente'))

    const result = await processPending()

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' }, data: expect.objectContaining({ status: 'FAILED' }) }),
    )
    expect(result).toEqual({ processed: 0, failed: 1, retried: 0 })
  })
})
