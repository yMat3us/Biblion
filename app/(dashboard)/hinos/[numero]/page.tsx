import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { ApiError } from '@/lib/http'
import { HinoService } from '@/lib/services/hino'
import { hinoParamsSchema } from '@/lib/validation'
import { HinoReaderClient } from './HinoReaderClient'

export const dynamic = 'force-dynamic'

async function loadHino(userId: string, numero: number) {
  try {
    return await HinoService.get(userId, 'harpa', numero)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export default async function HinoPage({ params }: { params: Promise<{ numero: string }> }) {
  const user = await requirePageUser()
  const parsed = hinoParamsSchema.safeParse(await params)
  if (!parsed.success) notFound()

  const hino = await loadHino(user.id, parsed.data.numero)

  return (
    <HinoReaderClient
      hino={{
        numero: hino.numero,
        titulo: hino.titulo,
        autor: hino.autor,
        categoria: hino.categoria,
        tom: hino.tom,
        estrofes: hino.estrofes,
        coro: hino.coro,
        audioUrl: hino.audioUrl,
        favorito: hino.favorito,
        anterior: hino.anterior,
        proximo: hino.proximo,
      }}
    />
  )
}
