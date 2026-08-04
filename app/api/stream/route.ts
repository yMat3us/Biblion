import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { bus } from '@/lib/events/bus'

// Stream SSE por usuário: entrega eventos em tempo real (novas mensagens,
// amizades) empurrados pelo bus. Exige conexão longa → runtime nodejs (o deploy
// standalone a suporta). Em serverless, o EventSource do client reconecta ao
// atingir maxDuration, então quedas periódicas são transparentes.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const HEARTBEAT_MS = 25_000

export const GET = route(async (req: NextRequest, _ctx, user) => {
  if (!user) {
    console.error('[STREAM ERROR] user is null!', { user, _ctx })
    return new Response('Unauthorized', { status: 401 })
  }
  const channel = `user:${user.id}`
  const encoder = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // Controller já fechado (client desconectou entre o check e o enqueue).
        }
      }

      // Confirma a conexão e assina o canal do usuário.
      safeEnqueue(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`)
      heartbeat = setInterval(() => safeEnqueue(': ping\n\n'), HEARTBEAT_MS)
      bus.subscribe(
        channel,
        (payload) => safeEnqueue(`event: event\ndata: ${JSON.stringify(payload)}\n\n`),
        req.signal,
      )

      const onAbort = () => {
        if (closed) return
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // Já fechado.
        }
      }
      req.signal.addEventListener('abort', onAbort, { once: true })
    },
    cancel() {
      closed = true
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      // Desabilita buffering de proxies (ex.: nginx) para o stream fluir em tempo real.
      'X-Accel-Buffering': 'no',
    },
  })
})
