import { requirePageUser } from '@/lib/auth-page'
import { ensurePublicId } from '@/lib/public-id'
import { SocialService } from '@/lib/services/social'
import { AmigosClient } from './AmigosClient'

export const dynamic = 'force-dynamic'

export default async function AmigosPage() {
  const user = await requirePageUser()
  // Garante que a conta tenha um identificador público (backfill preguiçoso).
  await ensurePublicId(user.id, user.publicId)
  const amigos = await SocialService.listFriends(user.id)

  return <AmigosClient amigosIniciais={amigos} />
}
