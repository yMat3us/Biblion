import 'server-only'

import { PrismaClient } from '@prisma/client'

// `server-only` é a pedra angular da fronteira de módulo: como todos os serviços
// e libs que tocam o banco importam este cliente, marcá-lo aqui faz o build
// FALHAR se qualquer código de acesso a dados vazar para um bundle de client.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

