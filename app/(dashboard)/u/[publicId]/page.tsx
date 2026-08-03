import { notFound } from 'next/navigation'
import { requirePageUser } from '@/lib/auth-page'
import { ApiError } from '@/lib/http'
import { PublicProfileService } from '@/lib/services/public-profile'
import { ProfileView } from './ProfileView'

export const dynamic = 'force-dynamic'

async function load(viewerId: string, publicId: string) {
  try {
    return await PublicProfileService.getByPublicId(viewerId, publicId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  }
}

export default async function PerfilPublicoPage({ params }: { params: Promise<{ publicId: string }> }) {
  const user = await requirePageUser()
  const { publicId } = await params
  const { user: perfil, relationship, restrito, conteudo } = await load(user.id, publicId)

  return (
    <ProfileView
      perfil={{
        id: perfil.id,
        publicId: perfil.publicId,
        username: perfil.username,
        displayName: perfil.displayName,
        avatarUrl: perfil.avatarUrl,
        bio: perfil.bio,
      }}
      relationshipInicial={relationship}
      restrito={restrito}
      conteudo={conteudo}
    />
  )
}
