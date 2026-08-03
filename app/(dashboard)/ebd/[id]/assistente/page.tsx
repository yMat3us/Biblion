import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { LicaoService } from '@/lib/services/ebd'
import { EBDAssistenteClient } from './AssistenteClient'

export default async function AssistentePage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requirePageUser(), params])
  const licao = await LicaoService.find(user.id, id)
  if (!licao) notFound()
  return <EBDAssistenteClient licao={licao} />
}
