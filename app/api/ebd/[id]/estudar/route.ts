import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { LicaoService } from '@/lib/services/ebd'
import { generateLessonStudy } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

export const POST = route<Ctx>(
  async (_req, { params }, user) => {
    const { id } = await params
    const licao = await LicaoService.get(user.id, id)
    const study = await generateLessonStudy(licao)
    const updated = await LicaoService.update(user.id, id, {
      resumo: study.resumo,
      aplicacao: study.aplicacao,
      esboco: study.esboco,
    })
    return ok(updated)
  },
  { rateLimit: RateLimits.ai },
)
