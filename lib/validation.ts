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

export const CONTENT_VISIBILITY = ['PRIVATE', 'FRIENDS', 'PUBLIC'] as const

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(1_500_000)
    .refine(
      (value) =>
        value === '' ||
        value.startsWith('https://') ||
        /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
      'A foto deve ser um upload de imagem válido ou uma URL HTTPS',
    )
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
})

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
  dias: z.coerce.number().int().min(1).max(30),
  visibility: z.enum(PLAN_VISIBILITY).optional().default('PRIVATE'),
})

// ---------------------------------------------------------------------------
// Social: busca de usuários, amizades e bloqueio
// ---------------------------------------------------------------------------
// IDs de conta são ObjectId (24 hex); o teto de 50 é folga com segurança.
const userId = z.string().trim().min(1).max(50)

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
  id: z.string().trim().max(50).optional(),
})
