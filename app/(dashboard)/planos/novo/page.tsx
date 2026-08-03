import { requirePageUser } from '@/lib/auth-page'
import { NovoPlanoClient } from './NovoPlanoClient'

export const dynamic = 'force-dynamic'

export default async function NovoPlanoPage() {
  await requirePageUser()
  return <NovoPlanoClient />
}
