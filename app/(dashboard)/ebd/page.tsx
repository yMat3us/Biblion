import { requirePageUser } from '@/lib/auth-page'
import { RevistaService } from '@/lib/services/ebd'
import { EBDClient } from './EBDClient'

export const dynamic = 'force-dynamic'

export default async function EBDPage() {
  const user = await requirePageUser()
  const revistas = await RevistaService.list(user.id)
  return <EBDClient initialRevistas={revistas} />
}
