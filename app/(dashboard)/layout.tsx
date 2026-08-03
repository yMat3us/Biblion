import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { requirePageUserWithAvatar } from '@/lib/auth-page'

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  // O chrome (cabeçalho + sidebar) exibe o avatar, então buscamos a versão com avatar.
  const user = await requirePageUserWithAvatar()
  return <DashboardLayout user={user}>{children}</DashboardLayout>
}
