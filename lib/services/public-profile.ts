import { Prisma, Visibility } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ApiErrors } from '@/lib/http'
import { SocialService, type RelationshipStatus } from '@/lib/services/social'

const PROFILE_SELECT = {
  id: true,
  publicId: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  accentColor: true,
  profileVisibility: true,
  createdAt: true,
} satisfies Prisma.UserSelect

/** Carrega SOMENTE conteúdo marcado como PUBLIC do dono informado. */
async function loadPublicContent(ownerId: string) {
  const publico = { ownerId, visibility: Visibility.PUBLIC }
  const [planos, sermoes, esbocos, anotacoes, licoes] = await Promise.all([
    prisma.readingPlan.findMany({
      where: publico,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: { id: true, titulo: true, descricao: true, categoria: true, duracaoDias: true },
    }),
    prisma.sermao.findMany({
      where: publico,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: { id: true, titulo: true, tema: true, textoBase: true, categoria: true },
    }),
    prisma.esboco.findMany({
      where: publico,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: { id: true, titulo: true, textoBase: true, categoria: true },
    }),
    prisma.anotacao.findMany({
      where: publico,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: { id: true, titulo: true, referencia: true, livro: true },
    }),
    prisma.licaoEBD.findMany({
      where: publico,
      orderBy: { updatedAt: 'desc' },
      take: 24,
      select: { id: true, titulo: true, textoBase: true },
    }),
  ])
  return { planos, sermoes, esbocos, anotacoes, licoes }
}

export type PublicContent = Awaited<ReturnType<typeof loadPublicContent>>

const EMPTY_CONTENT: PublicContent = { planos: [], sermoes: [], esbocos: [], anotacoes: [], licoes: [] }

export const PublicProfileService = {
  getByPublicId: async (viewerId: string, publicId: string) => {
    const user = await prisma.user.findFirst({ where: { publicId, isActive: true }, select: PROFILE_SELECT })
    if (!user) throw ApiErrors.notFound('Perfil não encontrado')

    const isSelf = user.id === viewerId

    if (isSelf) {
      return { user, relationship: 'self' as RelationshipStatus, restrito: false, conteudo: await loadPublicContent(user.id) }
    }

    // Bloqueio em qualquer direção esconde totalmente o perfil (anti-enumeração).
    if (await SocialService.isBlockedBetween(viewerId, user.id)) throw ApiErrors.notFound('Perfil não encontrado')

    // Perfil privado: invisível para terceiros.
    if (user.profileVisibility === Visibility.PRIVATE) throw ApiErrors.notFound('Perfil não encontrado')

    const relationship = await SocialService.relationship(viewerId, user.id)

    // Perfil "somente amigos": mostra o cabeçalho, mas oculta o conteúdo de quem não é amigo.
    if (user.profileVisibility === Visibility.FRIENDS && relationship !== 'friends') {
      return { user, relationship, restrito: true, conteudo: EMPTY_CONTENT }
    }

    return { user, relationship, restrito: false, conteudo: await loadPublicContent(user.id) }
  },
}
