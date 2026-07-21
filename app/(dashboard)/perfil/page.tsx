import { requirePageUser } from '@/lib/auth-page'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const user = await requirePageUser()
  return <ProfileClient user={user} />
}
