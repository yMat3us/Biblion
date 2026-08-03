import { requirePageUser } from '@/lib/auth-page'
import { SermaoService } from '@/lib/services/sermao'
import { SermoesClient } from './SermoesClient'

export const dynamic = 'force-dynamic'

export default async function SermoesPage() {
  const user = await requirePageUser()
  const { items, nextCursor } = await SermaoService.list(user.id)
  return <SermoesClient sermoes={items} initialCursor={nextCursor} />
}
