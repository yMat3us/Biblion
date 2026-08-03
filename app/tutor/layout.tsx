import { requirePageUserWithAvatar } from '@/lib/auth-page'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  await requirePageUserWithAvatar()
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {children}
    </div>
  )
}
