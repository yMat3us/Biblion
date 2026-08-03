import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { SermaoService } from '@/lib/services/sermao'
import { SermonEditClient } from './SermonEditClient'

export default async function EditSermonPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requirePageUser(), params])
  const sermao = await SermaoService.find(user.id, id)
  if (!sermao) notFound()
  return <SermonEditClient sermao={sermao} />
}
