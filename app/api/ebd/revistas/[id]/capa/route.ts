import type { NextRequest } from 'next/server'
import { route } from '@/lib/route'
import { ApiErrors } from '@/lib/http'
import { prisma } from '@/lib/prisma'
import { RateLimits } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ id: string }> }

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array<ArrayBuffer> } | null {
  if (!dataUrl.startsWith('data:image/')) return null
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const header = dataUrl.slice(5, comma)
  if (!/;base64$/i.test(header)) return null
  const mime = header.split(';')[0]
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return null

  const source = Buffer.from(dataUrl.slice(comma + 1), 'base64')
  const bytes = new Uint8Array(source.byteLength)
  bytes.set(source)
  return { mime, bytes }
}

export const GET = route<Ctx>(
  async (req: NextRequest, { params }, user) => {
    const { id } = await params
    const meta = await prisma.revistaEBD.findFirst({
      where: { id, ownerId: user.id },
      select: { updatedAt: true },
    })
    if (!meta) throw ApiErrors.notFound('Revista não encontrada')

    const etag = `"capa-${id}-${meta.updatedAt.getTime()}"`
    if (req.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } })
    }

    const row = await prisma.revistaEBD.findFirst({
      where: { id, ownerId: user.id },
      select: { capa: true },
    })
    const parsed = row?.capa ? parseDataUrl(row.capa) : null
    if (!parsed) throw ApiErrors.notFound('Capa não encontrada')

    return new Response(parsed.bytes, {
      headers: {
        'Content-Type': parsed.mime,
        'Content-Length': String(parsed.bytes.byteLength),
        ETag: etag,
      },
    })
  },
  { rateLimit: RateLimits.standard },
)
