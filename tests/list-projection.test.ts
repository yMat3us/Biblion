import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  sermao: { findMany: vi.fn() },
  esboco: { findMany: vi.fn() },
  anotacao: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { SermaoService } from '@/lib/services/sermao'
import { EsbocoService } from '@/lib/services/esboco'
import { AnotacaoService } from '@/lib/services/anotacao'

// Regressão de performance: as listagens devem projetar só os campos do card.
// O match exato do `select` garante que os campos pesados (corpo do sermão, etc.)
// não voltem a ser trazidos silenciosamente em toda listagem.
describe('Projeção mínima das listas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.sermao.findMany.mockResolvedValue([])
    prisma.esboco.findMany.mockResolvedValue([])
    prisma.anotacao.findMany.mockResolvedValue([])
  })

  it('SermaoService.list não traz o corpo do sermão (topicos/conclusao/aplicacao/tags)', async () => {
    await SermaoService.list('u1')
    expect(prisma.sermao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          titulo: true,
          tema: true,
          textoBase: true,
          introducao: true,
          categoria: true,
          publicado: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    )
  })

  it('EsbocoService.list projeta o necessário (mantém conteudo, descarta modelo/visibility/updatedAt)', async () => {
    await EsbocoService.list('u1')
    expect(prisma.esboco.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, titulo: true, textoBase: true, conteudo: true, categoria: true, createdAt: true },
      }),
    )
  })

  it('AnotacaoService.list projeta o card e descarta referência bíblica/visibility', async () => {
    await AnotacaoService.list('u1')
    expect(prisma.anotacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, titulo: true, conteudo: true, tags: true, fixada: true, cor: true, createdAt: true },
      }),
    )
  })
})
