import { requirePageUser } from '@/lib/auth-page'
import { ensurePublicId } from '@/lib/public-id'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const user = await requirePageUser()
  const publicId = await ensurePublicId(user.id, user.publicId)
  return <ProfileClient user={{ ...user, publicId }} />
}
