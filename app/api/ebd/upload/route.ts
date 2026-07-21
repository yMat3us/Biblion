import type { NextRequest } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { route } from '@/lib/route'
import { ApiErrors, created, ok } from '@/lib/http'
import { RateLimits } from '@/lib/rate-limit'
import { LicaoService } from '@/lib/services/ebd'
import { processEBDLessonText } from '@/lib/ai'

export const runtime = 'nodejs'

const MAX_PDF_BYTES = 15 * 1024 * 1024
const MAX_EXTRACTED_TEXT_CHARS = 1_000_000
const MAX_PDF_IMAGE_PIXELS = 25_000_000

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({
    data: buffer,
    isEvalSupported: false,
    maxImageSize: MAX_PDF_IMAGE_PIXELS,
    stopAtErrors: true,
    useSystemFonts: false,
  })

  try {
    const result = await parser.getText()
    return result.text.trim()
  } catch {
    throw ApiErrors.badRequest('PDF inválido ou não suportado')
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

export const POST = route(
  async (req: NextRequest, _ctx, user) => {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) throw ApiErrors.badRequest('Nenhum arquivo enviado')
    if (file.type && file.type !== 'application/pdf') throw ApiErrors.badRequest('O arquivo deve ser um PDF')
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) throw ApiErrors.payloadTooLarge('O PDF deve ter no máximo 15 MB')

    const revistaIdRaw = formData.get('revistaId')
    const numeroRaw = formData.get('numero')
    const revistaId = typeof revistaIdRaw === 'string' && revistaIdRaw ? revistaIdRaw : null
    const numero = typeof numeroRaw === 'string' && /^\d{1,3}$/.test(numeroRaw) ? Number(numeroRaw) : null

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw ApiErrors.badRequest('Assinatura de arquivo PDF inválida')

    const rawText = await extractPdfText(buffer)
    if (!rawText) throw ApiErrors.badRequest('Não foi possível extrair texto do PDF')
    if (rawText.length > MAX_EXTRACTED_TEXT_CHARS) throw ApiErrors.payloadTooLarge('O texto extraído do PDF é muito grande')

    const structured = await processEBDLessonText(rawText)
    const licao = await LicaoService.create(user.id, {
      titulo: structured.titulo,
      numero,
      revistaId,
      textoBase: structured.textoBase,
      objetivos: structured.objetivos,
      introducao: structured.introducao,
      topicos: JSON.stringify(structured.topicos),
      conclusao: structured.conclusao,
      perguntas: JSON.stringify(structured.perguntas),
      resumo: structured.resumo,
      conteudoRaw: rawText,
    })
    return created(licao)
  },
  { rateLimit: RateLimits.aiUpload },
)

export const GET = route(
  async (_req, _ctx, user) => ok(await LicaoService.listSummaries(user.id)),
  { rateLimit: RateLimits.standard },
)
