import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { requirePageUser } from '@/lib/auth-page'

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser()
  return <DashboardLayout user={user}>{children}</DashboardLayout>
}
