import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { z } from 'zod'
import { parseJson } from '@/lib/validation'
import { generateBookInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'
import { db } from '@/lib/firebase'

export const maxDuration = 60

export const POST = route(
  async (req: NextRequest) => {
    const { bookName } = await parseJson(req, z.object({ bookName: z.string() }))
    
    const docId = bookName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-')
    // const docRef = db.collection('bookInsights').doc(docId)
    // const docSnap = await docRef.get()
    
    /* if (docSnap.exists) {
      return ok(docSnap.data())
    } */

    const insights = await generateBookInsights(bookName)
    // await docRef.set(insights)
    
    return ok(insights)
  },
  { rateLimit: RateLimits.ai },
)
