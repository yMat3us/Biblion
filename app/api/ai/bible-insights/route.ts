import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ok } from '@/lib/http'
import { parseJson, aiVerseSchema } from '@/lib/validation'
import { generateBibleInsights } from '@/lib/ai'
import { RateLimits } from '@/lib/rate-limit'
import { db } from '@/lib/firebase'

export const maxDuration = 60

export const POST = route(
  async (req: NextRequest) => {
    const { verseRef, verseText } = await parseJson(req, aiVerseSchema)
    
    const docId = verseRef.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    const docRef = db.collection('verseInsights').doc(docId)
    await docRef.delete() // Força a deleção para testar novamente
    const docSnap = await docRef.get()
    
    if (docSnap.exists && docSnap.data()?.status !== 'ERROR') {
      return ok(docSnap.data())
    }

    // Cria o documento com status GENERATING
    await docRef.set({ status: 'GENERATING', verseRef, startedAt: new Date().toISOString() })

    // Floating Promise: Roda a IA em BACKGROUND
    generateBibleInsights(verseRef, verseText).then(async (insights) => {
      await docRef.set({ ...insights, status: 'APPROVED' })
    }).catch(async (error) => {
      console.error('[Pipeline] Error generating insights:', error)
      await docRef.set({ status: 'ERROR', error: error.message || 'Erro desconhecido', verseRef })
    })
    
    // Retorna resposta imediatamente (UX rápida)
    return ok({ status: 'GENERATING', docId })
  },
  { rateLimit: RateLimits.ai },
)
