import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  conversation: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  conversationParticipant: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  message: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  notification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
  friendship: { findFirst: vi.fn() },
  block: { findFirst: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { ChatService } from '@/lib/services/chat'
import { NotificationService } from '@/lib/services/notification'

describe('ChatService — controle de acesso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.conversation.findFirst.mockResolvedValue(null)
    prisma.conversation.create.mockResolvedValue({ id: 'c1' })
    prisma.conversation.update.mockResolvedValue({})
    prisma.conversationParticipant.findUnique.mockResolvedValue(null)
    prisma.conversationParticipant.findFirst.mockResolvedValue(null)
    prisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 })
    prisma.message.create.mockResolvedValue({ id: 'm1', corpo: 'olá', senderId: 'alice', createdAt: new Date(), deletedAt: null })
    prisma.message.updateMany.mockResolvedValue({ count: 0 })
    prisma.friendship.findFirst.mockResolvedValue(null)
    prisma.block.findFirst.mockResolvedValue(null)
    prisma.notification.findFirst.mockResolvedValue(null)
    prisma.notification.create.mockResolvedValue({})
  })

  it('não permite iniciar conversa com quem não é amigo', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    // block null, friendship null (não são amigos)
    await expect(ChatService.getOrCreateConversation('alice', 'bob')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    expect(prisma.conversation.create).not.toHaveBeenCalled()
  })

  it('cria a conversa entre amigos quando ainda não existe', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'bob' })
    prisma.friendship.findFirst.mockResolvedValueOnce({ id: 'f1' }) // areFriends → true
    prisma.conversation.findFirst.mockResolvedValueOnce(null)

    const result = await ChatService.getOrCreateConversation('alice', 'bob')

    expect(result).toEqual({ id: 'c1' })
    expect(prisma.conversation.create).toHaveBeenCalled()
  })

  it('nega leitura da conversa a quem não é participante', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValueOnce(null)
    await expect(ChatService.getConversation('alice', 'c1')).rejects.toMatchObject({ status: 404 })
  })

  it('bloqueia o envio quando os usuários não são mais amigos', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValueOnce({ id: 'p1' })
    prisma.conversationParticipant.findFirst.mockResolvedValueOnce({ userId: 'bob' })
    // block null, friendship null → não são amigos
    await expect(ChatService.sendMessage('alice', 'c1', 'oi')).rejects.toMatchObject({ status: 403 })
    expect(prisma.message.create).not.toHaveBeenCalled()
  })

  it('envia a mensagem e notifica o destinatário entre amigos', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValueOnce({ id: 'p1' })
    prisma.conversationParticipant.findFirst.mockResolvedValueOnce({ userId: 'bob' })
    prisma.friendship.findFirst.mockResolvedValueOnce({ id: 'f1' }) // amigos

    const result = await ChatService.sendMessage('alice', 'c1', 'olá')

    expect(result).toMatchObject({ id: 'm1', minha: true, removida: false, corpo: 'olá' })
    expect(prisma.message.create).toHaveBeenCalled()
    expect(prisma.notification.create).toHaveBeenCalled()
  })

  it('só o autor apaga a própria mensagem (soft-delete)', async () => {
    prisma.message.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(ChatService.deleteMessage('alice', 'c1', 'm1')).rejects.toMatchObject({ status: 404 })

    prisma.message.updateMany.mockResolvedValueOnce({ count: 1 })
    await expect(ChatService.deleteMessage('alice', 'c1', 'm1')).resolves.toEqual({ success: true })
  })
})

describe('NotificationService — coalescência de mensagens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.notification.findFirst.mockResolvedValue(null)
    prisma.notification.create.mockResolvedValue({})
    prisma.notification.update.mockResolvedValue({})
  })

  it('atualiza a notificação existente em vez de criar outra', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce({ id: 'n1' })
    await NotificationService.notifyMessage('bob', 'alice', 'c1')
    expect(prisma.notification.update).toHaveBeenCalled()
    expect(prisma.notification.create).not.toHaveBeenCalled()
  })

  it('cria uma notificação quando não há não-lida da conversa', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce(null)
    await NotificationService.notifyMessage('bob', 'alice', 'c1')
    expect(prisma.notification.create).toHaveBeenCalled()
  })
})
