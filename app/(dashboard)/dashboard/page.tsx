import { Footer } from '@/components/layout/Footer'
import { requirePageUser } from '@/lib/auth-page'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

async function safe<T>(promise: Promise<T>, fallback: T, timeoutMs = 8000): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
  } catch {
    return fallback
  }
}

export default async function DashboardPage() {
  const user = await requirePageUser()
  const where = { ownerId: user.id }
  const [sermoesCount, esbocosCount, anotacoesCount, licoesCount, recentSermoes, recentEstudos] = await Promise.all([
    safe(prisma.sermao.count({ where }), 0),
    safe(prisma.esboco.count({ where }), 0),
    safe(prisma.anotacao.count({ where }), 0),
    safe(prisma.licaoEBD.count({ where }), 0),
    safe(prisma.sermao.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5 }), []),
    safe(prisma.anotacao.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5 }), []),
  ])

  const feedItems = [
    ...recentSermoes.map((sermao) => ({ type: 'sermão', ...sermao })),
    ...recentEstudos.map((estudo) => ({ type: 'estudo', ...estudo })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  const renderedAt = new Date()
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(renderedAt)
  const userName = (user.displayName || user.username).split(' ')[0]

  return (
    <>
      <DashboardClient
        data={{
          sermoes: sermoesCount,
          esbocos: esbocosCount,
          anotacoes: anotacoesCount,
          licoes: licoesCount,
          feedItems: feedItems.slice(0, 8),
        }}
        userName={userName}
        today={today}
      />
      <Footer />
    </>
  )
}
