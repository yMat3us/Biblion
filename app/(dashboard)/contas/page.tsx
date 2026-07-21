import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { UserService } from '@/lib/services/user'
import { AccountsClient } from './AccountsClient'

export default async function AccountsPage() {
  const user = await requirePageUser()
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') notFound()
  const accounts = await UserService.list()

  return (
    <AccountsClient
      currentUserId={user.id}
      currentRole={user.role}
      initialAccounts={accounts.map((account) => ({
        ...account,
        lastLoginAt: account.lastLoginAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      }))}
    />
  )
}
