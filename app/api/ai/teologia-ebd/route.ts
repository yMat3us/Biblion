import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { created } from '@/lib/http'
import { parseJson, aiTeologiaEbdSchema } from '@/lib/validation'
import { theologyToEBDLesson } from '@/lib/ai'
import { LicaoService } from '@/lib/services/ebd'
import { RateLimits } from '@/lib/rate-limit'

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const input = await parseJson(req, aiTeologiaEbdSchema)
    const lesson = await theologyToEBDLesson(input)
    const licao = await LicaoService.create(user.id, {
      titulo: `Aula: ${lesson.titulo}`,
      textoBase: lesson.textoBase || input.versiculos[0] || 'Vários textos',
      objetivos: lesson.objetivos,
      introducao: lesson.introducao,
      topicos: JSON.stringify(lesson.topicos),
      conclusao: lesson.conclusao,
      perguntas: JSON.stringify(lesson.perguntas),
      resumo: lesson.resumo,
      conteudoRaw: JSON.stringify(lesson),
      data: new Date(),
    })
    return created({ licaoId: licao.id })
  },
  { rateLimit: RateLimits.ai },
)
