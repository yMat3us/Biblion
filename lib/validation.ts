import { z } from 'zod'
import { ApiErrors } from '@/lib/http'

interface ParseJsonOptions {
  /**
   * Reject bodies larger than this many bytes with 413 before parsing/validation.
   * Left undefined for most endpoints (schema field caps already bound them); set
   * it where the schema alone cannot bound cost/DoS, e.g. the streaming AI tutor.
   */
  maxBytes?: number
}

/** Parse + validate a JSON request body. Throws ApiError(400/413) / ZodError(422). */
export async function parseJson<T>(req: Request, schema: z.ZodType<T>, options?: ParseJsonOptions): Promise<T> {
  const maxBytes = options?.maxBytes

  // Fast path: reject on the declared length before buffering the body at all.
  if (maxBytes !== undefined) {
    const declaredLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw ApiErrors.payloadTooLarge()
    }
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    throw ApiErrors.badRequest('Corpo da requisição não é um JSON válido')
  }

  // Absent/spoofed Content-Length still can't slip past the real measured size.
  if (maxBytes !== undefined && Buffer.byteLength(raw) > maxBytes) {
    throw ApiErrors.payloadTooLarge()
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    throw ApiErrors.badRequest('Corpo da requisição não é um JSON válido')
  }
  return schema.parse(body)
}

// ---------------------------------------------------------------------------
// ObjectId (MongoDB): exatamente 24 caracteres hexadecimais.
// Validar o formato ANTES do Prisma evita depender de erros do banco (P2023) e
// rejeita entradas obviamente inválidas na fronteira, não na camada de dados.
// ---------------------------------------------------------------------------
export const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_REGEX.test(value)
}

export const objectId = z.string().trim().regex(OBJECT_ID_REGEX, 'Identificador inválido')

// ---------------------------------------------------------------------------
// Auth, accounts and profiles
// ---------------------------------------------------------------------------
const username = z
  .string()
  .trim()
  .min(3, 'O usuário deve ter pelo menos 3 caracteres')
  .max(32, 'O usuário deve ter no máximo 32 caracteres')
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Use apenas letras, números, ponto, hífen e sublinhado')

const password = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').max(200)

export const loginSchema = z.object({ username, password })

export const USER_ACCENT_COLORS = ['violet', 'blue', 'emerald', 'amber', 'rose'] as const
export const USER_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const

export const CONTENT_VISIBILITY = ['PRIVATE', 'FRIENDS', 'PUBLIC'] as const

const AVATAR_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/

/** Aceita: vazio, data URL de imagem embutida, ou URL HTTPS bem-formada.
 *  Usa new URL() em vez de startsWith para rejeitar hosts ausentes/malformados
 *  ("https://", "https:/x") e esquemas disfarçados. */
function isValidAvatarUrl(value: string): boolean {
  if (value === '') return true
  if (AVATAR_DATA_URL.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(1_500_000)
    .refine(isValidAvatarUrl, 'A foto deve ser um upload de imagem válido ou uma URL HTTPS')
    .optional(),
  accentColor: z
    .string()
    .trim()
    .refine(
      (value) => (USER_ACCENT_COLORS as readonly string[]).includes(value) || /^#[0-9a-fA-F]{6}$/.test(value),
      'Cor de destaque inválida',
    )
    .optional(),
  locale: z.enum(['pt-BR']).optional(),
  isSearchable: z.boolean().optional(),
  profileVisibility: z.enum(CONTENT_VISIBILITY).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
})

// Exclusão da própria conta (LGPD): exige reautenticação por senha.
export const accountDeleteSchema = z.object({
  password: z.string().min(1).max(200),
})

export const accountCreateSchema = z.object({
  username,
  password,
  displayName: z.string().trim().min(1).max(80).optional(),
  role: z.enum(USER_ROLES).optional().default('MEMBER'),
})

export const accountUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
    newPassword: password.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos uma alteração')

// ---------------------------------------------------------------------------
// Sermão
// ---------------------------------------------------------------------------
export const sermaoCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório').max(300),
  tema: z.string().trim().max(300).nullish(),
  textoBase: z.string().trim().min(1, 'Texto base é obrigatório').max(500),
  introducao: z.string().max(20_000).nullish(),
  topicos: z.string().max(200_000).nullish(),
  conclusao: z.string().max(20_000).nullish(),
  aplicacao: z.string().max(20_000).nullish(),
  categoria: z.string().max(100).nullish(),
  tags: z.string().max(2_000).nullish(),
  publicado: z.boolean().optional().default(false),
  visibility: z.enum(CONTENT_VISIBILITY).optional(),
})
export const sermaoUpdateSchema = sermaoCreateSchema.partial()

// ---------------------------------------------------------------------------
// Esboço
// ---------------------------------------------------------------------------
export const esbocoCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório').max(300),
  textoBase: z.string().max(500).nullish(),
  conteudo: z.string().max(200_000).optional().default('[]'),
  modelo: z.string().max(100).nullish(),
  categoria: z.string().max(100).nullish(),
})
export const esbocoUpdateSchema = esbocoCreateSchema.partial()

// ---------------------------------------------------------------------------
// Anotação
// ---------------------------------------------------------------------------
export const NOTE_COLORS = ['default', 'amber', 'blue', 'rose', 'purple', 'emerald'] as const

export const anotacaoCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório').max(300),
  conteudo: z.string().trim().min(1, 'Conteúdo é obrigatório').max(50_000),
  tags: z.array(z.string().trim().max(50)).max(50).optional().default([]),
  fixada: z.boolean().optional().default(false),
  cor: z.enum(NOTE_COLORS).optional().default('default'),
  livro: z.string().max(100).nullish(),
  capitulo: z.number().int().positive().max(200).nullish(),
  versiculo: z.number().int().positive().max(400).nullish(),
  referencia: z.string().max(200).nullish(),
  tipo: z.string().max(50).optional().default('geral'),
})
export const anotacaoUpdateSchema = anotacaoCreateSchema.partial()

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
export const configuracaoUpsertSchema = z.object({
  chave: z.enum(['bible_version']),
  valor: z.string().max(100),
})

// ---------------------------------------------------------------------------
// EBD
// ---------------------------------------------------------------------------
const MAX_COVER_BASE64 = 1_500_000

export const revistaCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório').max(300),
  trimestre: z.string().max(50).nullish(),
  ano: z.string().max(10).nullish(),
  tema: z.string().max(300).nullish(),
  capa: z.string().max(MAX_COVER_BASE64, 'Imagem de capa muito grande').nullish(),
})

const jsonOrArray = z.union([z.string().max(200_000), z.array(z.unknown())])

export const licaoUpdateSchema = z.object({
  titulo: z.string().trim().min(1).max(300).optional(),
  textoBase: z.string().max(500).nullish(),
  objetivos: z.string().max(50_000).nullish(),
  introducao: z.string().max(100_000).nullish(),
  topicos: jsonOrArray.optional(),
  conclusao: z.string().max(100_000).nullish(),
  perguntas: jsonOrArray.optional(),
  resumo: z.string().max(100_000).nullish(),
  aplicacao: z.string().max(100_000).nullish(),
  esboco: z.string().max(100_000).nullish(),
})

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------
export const aiSermonSchema = z.object({
  tema: z.string().trim().max(500).optional().default(''),
  texto: z.string().trim().min(1, 'Texto base é obrigatório').max(2_000),
  keyword: z.string().trim().max(300).optional().default(''),
  style: z.string().trim().max(100).optional().default('expositiva'),
  topicosBase: z.string().optional(),
})

export const aiVerseSchema = z.object({
  verseRef: z.string().trim().min(1).max(200),
  verseText: z.string().trim().min(1).max(5_000),
})

export const aiChapterSchema = z.object({
  chapterRef: z.string().trim().min(1).max(200),
  chapterText: z.string().trim().min(1).max(50_000),
})

export const aiBookSchema = z.object({ bookName: z.string().trim().min(1).max(100) })

export const aiTeologiaSchema = z.object({
  doutrina: z.string().trim().min(1).max(200),
  topico: z.string().trim().min(1).max(300),
  conteudo: z.string().max(20_000).optional().default(''),
})

export const aiTeologiaEbdSchema = aiTeologiaSchema.extend({
  versiculos: z.array(z.string().max(100)).max(50).optional().default([]),
})

export const searchSchema = z.object({
  query: z.string().trim().min(1, 'Informe um termo de busca').max(500),
  includeAi: z.boolean().optional().default(true),
})

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(50_000),
})

export const chatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  contextData: z.string().max(50_000).nullish(),
})

// UIMessage payloads (tutor IA) chegam do cliente e são reenviados por inteiro a
// cada rodada de streaming. Sem limites, um cliente pode inflar texto/anexos e
// disparar custo de IA/DoS (chatSchema já limita 50k; este não limitava nada).
// Capamos conteúdo por parte, anexos e partes por mensagem preservando os demais
// campos (id, metadata, state, mediaType…) que convertToModelMessages precisa.
export const MAX_UI_TEXT_PART = 32_000
export const MAX_UI_FILE_URL = 28_000_000
export const MAX_UI_PARTS_PER_MESSAGE = 24
export const MAX_UI_MESSAGES = 200
/** Teto absoluto do corpo do tutor: barra payloads abusivos com 413 antes do parse. */
export const TUTOR_MAX_BODY_BYTES = 100 * 1024 * 1024

const uiMessagePartSchema = z.looseObject({
  type: z.string().min(1).max(64),
  // Presente em text/reasoning parts; ausente nos demais (por isso opcional).
  text: z.string().max(MAX_UI_TEXT_PART).optional(),
  // Presente em file/image parts (pode ser data URL base64); bloqueia anexos gigantes.
  url: z.string().max(MAX_UI_FILE_URL).optional(),
})

// System é definido no servidor; recusamos qualquer mensagem system vinda do cliente.
const uiMessageSchema = z.looseObject({
  role: z.enum(['user', 'assistant']),
  parts: z.array(uiMessagePartSchema).min(1).max(MAX_UI_PARTS_PER_MESSAGE),
})

export const uiChatSchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(MAX_UI_MESSAGES),
})

export const bibleParamsSchema = z.object({
  version: z.string().trim().min(1).max(20),
  livroIndex: z.coerce.number().int().min(0).max(65),
  capitulo: z.coerce.number().int().min(1).max(200),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
})

// ---------------------------------------------------------------------------
// Hinos (Harpa Cristã e futuros hinários)
// ---------------------------------------------------------------------------
export const HYMNALS = ['harpa'] as const

export const hinoListQuerySchema = z.object({
  hinario: z.enum(HYMNALS).optional().default('harpa'),
  q: z.string().trim().max(120).optional().default(''),
  categoria: z.string().trim().max(80).optional().default(''),
  // Query strings chegam como texto; "false" é truthy, então comparamos explicitamente.
  favoritos: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
})

export const hinoParamsSchema = z.object({
  numero: z.coerce.number().int().min(1).max(2_000),
})

export const hinoFavoritoSchema = z.object({
  hinario: z.enum(HYMNALS).optional().default('harpa'),
  favoritar: z.boolean(),
})

// ---------------------------------------------------------------------------
// Planos de leitura (online e sociais)
// ---------------------------------------------------------------------------
// FRIENDS fica reservado no schema Prisma, mas a criação só expõe PRIVATE/PUBLIC
// enquanto o sistema de amizades não existir (evita prometer o que não entrega).
export const PLAN_VISIBILITY = ['PRIVATE', 'PUBLIC'] as const

export const planDaySchema = z.object({
  dia: z.number().int().min(1).max(400),
  titulo: z.string().trim().max(200).nullish(),
  referencia: z.string().trim().min(1, 'Informe a referência bíblica').max(300),
  reflexao: z.string().trim().min(1, 'Escreva a reflexão do dia').max(8_000),
  pergunta: z.string().trim().max(2_000).nullish(),
  acao: z.string().trim().max(2_000).nullish(),
  oracao: z.string().trim().max(4_000).nullish(),
})

export const planoCreateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório').max(200),
  descricao: z.string().trim().max(2_000).nullish(),
  categoria: z.string().trim().max(80).nullish(),
  capaCor: z.string().trim().max(20).nullish(),
  visibility: z.enum(PLAN_VISIBILITY).optional().default('PRIVATE'),
  dias: z.array(planDaySchema).min(1, 'Adicione ao menos um dia').max(400),
  motivo: z.string().optional(),
}).refine((data) => {
  if (data.dias.length > 60 && (!data.motivo || data.motivo.trim().length === 0)) {
    return false
  }
  return true
}, { message: "Motivo é obrigatório para planos com mais de 60 dias" })

export const planoUpdateSchema = z
  .object({
    titulo: z.string().trim().min(1).max(200).optional(),
    descricao: z.string().trim().max(2_000).nullish(),
    categoria: z.string().trim().max(80).nullish(),
    capaCor: z.string().trim().max(20).nullish(),
    visibility: z.enum(PLAN_VISIBILITY).optional(),
    dias: z.array(planDaySchema).min(1).max(400).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos uma alteração')

export const planoListQuerySchema = z.object({
  escopo: z.enum(['catalogo', 'meus', 'concluidos', 'criados']).optional().default('catalogo'),
  categoria: z.string().trim().max(80).optional().default(''),
  q: z.string().trim().max(120).optional().default(''),
})

export const planoFavoritoSchema = z.object({ favoritar: z.boolean() })

export const planoDiaConcluirSchema = z.object({ concluido: z.boolean() })

export const planoDiaParamsSchema = z.object({
  dia: z.coerce.number().int().min(1).max(400),
})

export const aiPlanoSchema = z.object({
  tema: z.string().trim().min(3, 'Descreva o tema do plano').max(300),
  dias: z.coerce.number().int().min(1).max(365),
  visibility: z.enum(PLAN_VISIBILITY).optional().default('PRIVATE'),
  motivo: z.string().optional(),
}).refine((data) => {
  if (data.dias > 60 && (!data.motivo || data.motivo.trim().length === 0)) {
    return false
  }
  return true
}, {
  message: 'Um motivo é obrigatório para planos maiores que 60 dias (sujeito à aprovação do administrador).',
  path: ['motivo'],
})

// ---------------------------------------------------------------------------
// Social: busca de usuários, amizades e bloqueio
// ---------------------------------------------------------------------------
// IDs de conta são ObjectId (24 hex): validados estritamente, não como string livre.
const userId = objectId

export const userSearchSchema = z.object({
  q: z.string().trim().min(2, 'Digite ao menos 2 caracteres').max(80),
})

export const amigoSolicitarSchema = z.object({ alvoId: userId })
export const amigoResponderSchema = z.object({ solicitanteId: userId, aceitar: z.boolean() })
export const amigoRemoverSchema = z.object({ alvoId: userId })
export const bloquearSchema = z.object({ alvoId: userId, bloquear: z.boolean() })
export const amigosListaQuerySchema = z.object({
  escopo: z.enum(['amigos', 'recebidas', 'enviadas']).optional().default('amigos'),
})

// ---------------------------------------------------------------------------
// Chat e notificações
// ---------------------------------------------------------------------------
export const conversaStartSchema = z.object({ alvoId: userId })

export const mensagemEnviarSchema = z.object({
  corpo: z.string().trim().min(1, 'Escreva uma mensagem').max(4_000),
})

export const conversaSinceSchema = z.object({
  since: z.string().datetime().optional(),
})

export const notificacaoLerSchema = z.object({
  // Opcional: ausente = marcar todas como lidas; presente = ObjectId de uma notificação.
  id: objectId.optional(),
})
