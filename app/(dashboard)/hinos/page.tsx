import { requirePageUser } from '@/lib/auth-page'
import { HinoService } from '@/lib/services/hino'
import { HinosClient } from './HinosClient'

export const dynamic = 'force-dynamic'

export default async function HinosPage() {
  const user = await requirePageUser()
  const { hinos, categorias, favoritos } = await HinoService.list(user.id, {
    hinario: 'harpa',
    q: '',
    categoria: '',
    favoritos: false,
  })

  return <HinosClient hinos={hinos} categorias={categorias} favoritosIniciais={favoritos} />
}
