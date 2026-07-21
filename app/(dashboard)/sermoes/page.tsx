import { requirePageUser } from '@/lib/auth-page'
import { SermaoService } from '@/lib/services/sermao'
import { SermoesClient } from './SermoesClient'

export const dynamic = 'force-dynamic'

export default async function SermoesPage() {
  const user = await requirePageUser()
  const sermoes = await SermaoService.list(user.id)
  return <SermoesClient sermoes={sermoes} />
}
