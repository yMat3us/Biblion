import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { ApiError } from '@/lib/http'
import { PlanoService } from '@/lib/services/plano'
import { PlanoDetailClient } from './PlanoDetailClient'

export const dynamic = 'force-dynamic'

async function loadPlano(userId: string, id: string) {
  try {
    return await PlanoService.get(userId, id)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export default async function PlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser()
  const { id } = await params
  const plano = await loadPlano(user.id, id)

  return (
    <PlanoDetailClient
      plano={{
        id: plano.id,
        titulo: plano.titulo,
        descricao: plano.descricao,
        categoria: plano.categoria,
        duracaoDias: plano.duracaoDias,
        visibility: plano.visibility,
        oficial: plano.oficial,
        isOwner: plano.isOwner,
        favorito: plano.favorito,
        autor: plano.owner.displayName || plano.owner.username,
        matricula: plano.matricula,
        diasConcluidos: plano.diasConcluidos,
        dias: plano.dias.map((dia) => ({
          dia: dia.dia,
          titulo: dia.titulo,
          referencia: dia.referencia,
          reflexao: dia.reflexao,
          pergunta: dia.pergunta,
          acao: dia.acao,
          oracao: dia.oracao,
        })),
      }}
    />
  )
}
