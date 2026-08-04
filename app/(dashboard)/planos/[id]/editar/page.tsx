import { requirePageUser } from '@/lib/auth-page'
import { PlanoService } from '@/lib/services/plano'
import { notFound } from 'next/navigation'
import { EditarPlanoClient } from './EditarPlanoClient'

export const dynamic = 'force-dynamic'

export default async function EditarPlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser()
  const id = (await params).id
  
  const plan = await PlanoService.get(user.id, id).catch(() => null)
  if (!plan || !plan.isOwner) notFound()

  return <EditarPlanoClient plano={plan as Record<string, unknown> & { id: string, source: string, titulo: string, descricao: string, categoria: string, visibility: string, dias: { titulo?: string, referencia?: string, reflexao?: string, pergunta?: string, acao?: string, oracao?: string }[] }} />
}
