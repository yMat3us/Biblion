import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { HYMNALS, hinoParamsSchema } from '@/lib/validation'
import { HinoService } from '@/lib/services/hino'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ numero: string }> }

export const GET = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { numero } = hinoParamsSchema.parse(await params)
    const requested = req.nextUrl.searchParams.get('hinario')
    const hinario = (HYMNALS as readonly string[]).includes(requested ?? '') ? (requested as string) : 'harpa'
    return ok(await HinoService.get(user.id, hinario, numero))
  },
  { rateLimit: RateLimits.standard },
)
