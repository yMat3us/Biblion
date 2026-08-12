import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiChapterSchema } from '@/lib/validation'
import { generateChapterInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'
import { db } from '@/lib/firebase'

export const maxDuration = 60

export const POST = route(
  async (req: NextRequest) => {
    const { chapterRef, chapterText } = await parseJson(req, aiChapterSchema)
    
    const docId = chapterRef.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-')
    // const docRef = db.collection('chapterInsights').doc(docId)
    // const docSnap = await docRef.get()
    
    /* if (docSnap.exists) {
      return ok(docSnap.data())
    } */

    const insights = await generateChapterInsights(chapterRef, chapterText)
    // await docRef.set(insights)
    
    return ok(insights)
  },
  { rateLimit: RateLimits.ai },
)
