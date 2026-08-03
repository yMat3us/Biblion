import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { SermaoService } from '@/lib/services/sermao'
import { SermonDetailClient } from './SermonDetailClient'

export default async function SermonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requirePageUser(), params])
  const sermao = await SermaoService.find(user.id, id)
  if (!sermao) notFound()
  return <SermonDetailClient sermao={sermao} />
}
