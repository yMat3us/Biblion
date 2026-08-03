import { requirePageUserWithAvatar } from '@/lib/auth-page'
import { ensurePublicId } from '@/lib/public-id'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  // A tela de perfil edita o avatar, então precisa da versão com avatar.
  const user = await requirePageUserWithAvatar()
  const publicId = await ensurePublicId(user.id, user.publicId)
  return <ProfileClient user={{ ...user, publicId }} />
}
