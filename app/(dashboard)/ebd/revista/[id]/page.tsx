import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { RevistaService } from '@/lib/services/ebd'
import { RevistaClient } from './RevistaClient'

export default async function RevistaPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requirePageUser(), params])
  const revista = await RevistaService.findWithLicoes(user.id, id)
  if (!revista) notFound()
  return <RevistaClient revista={revista} />
}
