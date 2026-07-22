import { requirePageUser } from '@/lib/auth-page'
import { PlanoService } from '@/lib/services/plano'
import { PlanosClient } from './PlanosClient'

export const dynamic = 'force-dynamic'

export default async function PlanosPage() {
  const user = await requirePageUser()
  const [planos, categorias] = await Promise.all([
    PlanoService.listCatalog(user.id, { categoria: '', q: '' }),
    PlanoService.categorias(),
  ])

  return <PlanosClient catalogoInicial={planos} categorias={categorias} />
}
