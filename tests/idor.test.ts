import { beforeEach, describe, expect, it, vi } from 'vitest'

// Prova de IDOR/authz: um SEGUNDO usuário (o "invasor") jamais alcança recursos
// de outra conta. Cada serviço escopado por ownerId consulta findFirst({ where:
// { id, ownerId } }) e devolve 404 quando não pertence ao chamador (anti-enumeração),
// e create injeta o ownerId autenticado (ignorando qualquer ownerId forjado).
// Sermão e EBD estão em ownership.test.ts; Chat em chat.test.ts (403 p/ não
// participante); Social em social.test.ts (bloqueio/amizade). Aqui cobrimos o resto.

const prisma = vi.hoisted(() => ({
  esboco: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  anotacao: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  readingPlan: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  planDay: { deleteMany: vi.fn() },
  favorito: { deleteMany: vi.fn() },
  configuracao: { findUnique: vi.fn(), upsert: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { EsbocoService } from '@/lib/services/esboco'
import { AnotacaoService } from '@/lib/services/anotacao'
import { PlanoService } from '@/lib/services/plano'
import { ConfiguracaoService } from '@/lib/services/configuracao'

const INVASOR = 'owner-b'
const RECURSO_ALHEIO = 'recurso-do-owner-a'

beforeEach(() => {
  vi.clearAllMocks()
  prisma.esboco.findFirst.mockResolvedValue(null)
  prisma.anotacao.findFirst.mockResolvedValue(null)
  prisma.readingPlan.findFirst.mockResolvedValue(null)
  prisma.configuracao.findUnique.mockResolvedValue(null)
})

describe('IDOR — Esboço', () => {
  it('update de esboço alheio devolve 404 e não escreve', async () => {
    await expect(EsbocoService.update(INVASOR, RECURSO_ALHEIO, { titulo: 'x' })).rejects.toMatchObject({ status: 404 })
    expect(prisma.esboco.findFirst).toHaveBeenCalledWith({ where: { id: RECURSO_ALHEIO, ownerId: INVASOR } })
    expect(prisma.esboco.update).not.toHaveBeenCalled()
  })

  it('remove de esboço alheio devolve 404 e não apaga', async () => {
    await expect(EsbocoService.remove(INVASOR, RECURSO_ALHEIO)).rejects.toMatchObject({ status: 404 })
    expect(prisma.esboco.delete).not.toHaveBeenCalled()
  })

  it('create injeta o ownerId autenticado (ignora ownerId forjado)', async () => {
    prisma.esboco.create.mockResolvedValueOnce({ id: 'e1' })
    await EsbocoService.create(INVASOR, { titulo: 't', conteudo: '[]', ownerId: 'owner-a' } as never)
    expect(prisma.esboco.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: INVASOR }) })
  })
})

describe('IDOR — Anotação', () => {
  it('update de anotação alheia devolve 404 e não escreve', async () => {
    await expect(AnotacaoService.update(INVASOR, RECURSO_ALHEIO, { titulo: 'x' })).rejects.toMatchObject({ status: 404 })
    expect(prisma.anotacao.findFirst).toHaveBeenCalledWith({ where: { id: RECURSO_ALHEIO, ownerId: INVASOR } })
    expect(prisma.anotacao.update).not.toHaveBeenCalled()
  })

  it('remove de anotação alheia devolve 404 e não apaga', async () => {
    await expect(AnotacaoService.remove(INVASOR, RECURSO_ALHEIO)).rejects.toMatchObject({ status: 404 })
    expect(prisma.anotacao.delete).not.toHaveBeenCalled()
  })

  it('create injeta o ownerId autenticado (ignora ownerId forjado)', async () => {
    prisma.anotacao.create.mockResolvedValueOnce({ id: 'a1' })
    await AnotacaoService.create(INVASOR, { titulo: 't', conteudo: 'c', ownerId: 'owner-a' } as never)
    expect(prisma.anotacao.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: INVASOR }) })
  })
})

describe('IDOR — Plano de leitura', () => {
  it('get de plano privado alheio devolve 404 (escopo viewable inclui só o próprio ownerId)', async () => {
    await expect(PlanoService.get(INVASOR, RECURSO_ALHEIO)).rejects.toMatchObject({ status: 404 })
    expect(prisma.readingPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RECURSO_ALHEIO, OR: [{ ownerId: INVASOR }, { visibility: 'PUBLIC' }, { oficial: true }] },
      }),
    )
  })

  it('update de plano alheio devolve 404 e não escreve', async () => {
    await expect(PlanoService.update(INVASOR, RECURSO_ALHEIO, { titulo: 'x' })).rejects.toMatchObject({ status: 404 })
    expect(prisma.readingPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RECURSO_ALHEIO, ownerId: INVASOR } }),
    )
    expect(prisma.readingPlan.update).not.toHaveBeenCalled()
    expect(prisma.planDay.deleteMany).not.toHaveBeenCalled()
  })

  it('remove de plano alheio devolve 404 e não apaga nada', async () => {
    await expect(PlanoService.remove(INVASOR, RECURSO_ALHEIO)).rejects.toMatchObject({ status: 404 })
    expect(prisma.favorito.deleteMany).not.toHaveBeenCalled()
    expect(prisma.readingPlan.delete).not.toHaveBeenCalled()
  })
})

describe('IDOR — Configuração', () => {
  it('leitura é escopada ao ownerId do chamador (não alcança config alheia)', async () => {
    await ConfiguracaoService.get(INVASOR, 'bible_version')
    expect(prisma.configuracao.findUnique).toHaveBeenCalledWith({
      where: { ownerId_chave: { ownerId: INVASOR, chave: 'bible_version' } },
    })
  })

  it('escrita é escopada ao ownerId do chamador', async () => {
    prisma.configuracao.upsert.mockResolvedValueOnce({ id: 'c1' })
    await ConfiguracaoService.upsert(INVASOR, 'bible_version', 'NVI')
    expect(prisma.configuracao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId_chave: { ownerId: INVASOR, chave: 'bible_version' } },
        create: { ownerId: INVASOR, chave: 'bible_version', valor: 'NVI' },
      }),
    )
  })
})
