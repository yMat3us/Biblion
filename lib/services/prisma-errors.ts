import { Prisma } from '@prisma/client'
import { ApiErrors } from '@/lib/http'

/**
 * Runs an id-based Prisma operation and converts "record not found" (P2025)
 * and "malformed ObjectID" (P2023) into a typed 404 instead of leaking a raw
 * Prisma error. Any other error is rethrown for the global handler.
 */
export async function runById<T>(fn: () => Promise<T>, notFoundMessage: string): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025' || err.code === 'P2023') {
        throw ApiErrors.notFound(notFoundMessage)
      }
    }
    throw err
  }
}
