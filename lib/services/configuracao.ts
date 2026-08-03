import { prisma } from '@/lib/prisma'

export const ConfiguracaoService = {
  get: (ownerId: string, chave: string) =>
    prisma.configuracao.findUnique({ where: { ownerId_chave: { ownerId, chave } } }),

  upsert: (ownerId: string, chave: string, valor: string) =>
    prisma.configuracao.upsert({
      where: { ownerId_chave: { ownerId, chave } },
      update: { valor },
      create: { ownerId, chave, valor },
    }),
}
