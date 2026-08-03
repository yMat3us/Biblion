import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { LicaoService } from '@/lib/services/ebd'
import { LessonClient } from './LessonClient'

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requirePageUser(), params])
  const licao = await LicaoService.find(user.id, id)
  if (!licao) notFound()
  return <LessonClient licao={licao} />
}
