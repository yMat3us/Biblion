import { z } from 'zod'
import { ApiErrors } from '@/lib/http'

/** Parse + validate a JSON request body. Throws ApiError(400) / ZodError(422). */
export async function parseJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw ApiErrors.badRequest('Corpo da requisição não é um JSON válido')
  }
  return schema.parse(body)
}

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

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || value.startsWith('https://'), 'O avatar deve usar HTTPS')
    .optional(),
  accentColor: z.enum(USER_ACCENT_COLORS).optional(),
  locale: z.enum(['pt-BR']).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: password,
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

export const uiChatSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).min(1).max(200),
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
