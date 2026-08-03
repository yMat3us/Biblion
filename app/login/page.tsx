import { redirect } from 'next/navigation'
import { getPageUser } from '@/lib/auth-page'
import { safeInternalPath } from '@/lib/navigation'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>
}) {
  const [user, params] = await Promise.all([getPageUser(), searchParams])
  if (user) redirect('/dashboard')

  const rawFrom = Array.isArray(params.from) ? params.from[0] : params.from
  return <LoginForm from={safeInternalPath(rawFrom)} />
}
