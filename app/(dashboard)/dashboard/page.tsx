import { Footer } from '@/components/layout/Footer'
import { requirePageUser } from '@/lib/auth-page'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export const dynamic = 'force-dynamic'

import { getChapter } from '@/lib/bible'
import { DAILY_VERSES } from '@/lib/daily-verses'

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



const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / 86400000);
};

export default async function DashboardPage() {
  const user = await requirePageUser()
  const where = { ownerId: user.id }
  const [sermoesCount, esbocosCount, anotacoesCount, licoesCount, recentSermoes, recentEstudos, bibleVersionConfig] = await Promise.all([
    safe(prisma.sermao.count({ where }), 0),
    safe(prisma.esboco.count({ where }), 0),
    safe(prisma.anotacao.count({ where }), 0),
    safe(prisma.licaoEBD.count({ where }), 0),
    safe(prisma.sermao.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5 }), []),
    safe(prisma.anotacao.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5 }), []),
    safe(prisma.configuracao.findUnique({ where: { ownerId_chave: { ownerId: user.id, chave: 'bible_version' } } }), null),
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
  
  const dailyRef = DAILY_VERSES[getDayOfYear(renderedAt) % DAILY_VERSES.length]
  const userVersion = bibleVersionConfig?.valor || 'NVI'
  
  let verseText = "Lâmpada para os meus pés é tua palavra e luz para o meu caminho." // fallback genérico
  try {
    const chapterVerses = await getChapter(userVersion, dailyRef.bookIndex, dailyRef.chapter)
    if (chapterVerses && chapterVerses.length >= dailyRef.verse) {
      // Pega o texto e remove eventuais aspas do início e fim para não duplicar com o <blockquote> no frontend
      verseText = chapterVerses[dailyRef.verse - 1].text.trim().replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    }
  } catch (error) {
    console.error("Failed to load daily verse", error)
  }

  const dailyVerse = {
    text: verseText,
    reference: dailyRef.reference,
    book: dailyRef.book,
    chapter: String(dailyRef.chapter)
  }

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
        dailyVerse={dailyVerse}
      />
      <Footer />
    </>
  )
}
