# Biblion — Plataforma de Estudo Bíblico

Aplicação web para leitura da Bíblia, criação de sermões e esboços, estudo teológico, preparação de aulas da EBD e assistência por IA.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Interface | React 19, TypeScript 5 e Tailwind CSS 4 |
| Banco de dados | MongoDB com Prisma 6 |
| IA | Vercel AI SDK com Google Gemini ou OpenAI |
| Aplicativo | Capacitor 8 para Android |
| Testes | Vitest 4 |

## Autenticação e isolamento

O Biblion possui contas independentes e RBAC global com os cargos `OWNER`, `ADMIN` e `MEMBER`. Cada sermão, esboço, anotação, favorito, revista, lição e configuração possui um `ownerId` obrigatório; a camada de serviços aplica esse escopo em todas as leituras e mutações.

As senhas são armazenadas com scrypt (`N=32768`, salt aleatório). O login cria um token opaco aleatório, mas somente seu hash é persistido em `UserSession`. As sessões possuem expiração, limite por conta e revogação no logout ou na troca de senha. O cookie é `HttpOnly`, `SameSite=Lax` e `Secure` em produção.

A proteção é aplicada em três camadas:

- `proxy.ts` faz o redirecionamento otimista de páginas sem cookie;
- o layout protegido revalida a sessão no MongoDB;
- o wrapper `route()` autentica APIs por padrão, valida origem em operações mutáveis, aplica rate limit e respostas `no-store`.

Somente `POST /api/auth/login` é público. Recursos de outra conta retornam 404 para evitar enumeração.

## Desenvolvimento local

Pré-requisitos: Node.js 22 e MongoDB local ou Atlas.

```bash
npm ci
cp .env.example .env
# Preencha DATABASE_URL e as demais variáveis necessárias.
npm run prisma:generate
npm run db:push
npm run dev
```

A aplicação local usa `http://localhost:3000` por padrão. O primeiro `OWNER` deve ser criado pelo migrador descrito abaixo; não existe senha compartilhada ou conta padrão no código.

## Criação do primeiro owner e migração

O migrador é idempotente, não exclui documentos e exige exatamente um modo explícito. Forneça as credenciais apenas no ambiente do processo e remova-as após o uso.

```bash
# Preflight sem escrita
OWNER_USERNAME='owner' OWNER_PASSWORD='senha-forte' DRY_RUN=true npm run migrate:accounts

# Aplicação após revisar as contagens
OWNER_USERNAME='owner' OWNER_PASSWORD='senha-forte' APPLY_MIGRATION=true npm run migrate:accounts

# Verificação independente de owner, credencial, vínculos e documentos órfãos
OWNER_USERNAME='owner' OWNER_PASSWORD='senha-forte' REQUIRE_ALL_DATA_TARGET=true npm run verify:migration
```

Use `RESET_OWNER_PASSWORD=true` somente quando desejar redefinir a senha de uma conta alvo já existente; isso também revoga suas sessões.

## Variáveis de ambiente

Consulte `.env.example`. As principais variáveis são:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão MongoDB; use credencial dedicada e TLS em produção |
| `NEXT_PUBLIC_SITE_URL` | Origem pública; deve ser uma URL HTTPS em produção |
| `ALLOWED_ORIGINS` | Origens HTTPS adicionais autorizadas, separadas por vírgula |
| `TRUST_PROXY` | Deve ser `true` em produção, somente atrás de proxy confiável que saneie headers e bloqueie acesso direto ao Next |
| `AI_PROVIDER` | `gemini` ou `openai` |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` | Chave do provedor selecionado |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limit distribuído, recomendado para múltiplas instâncias |
| `CAPACITOR_SERVER_URL` | Origem HTTPS obrigatória para `npm run cap:sync`; o script carrega `.env` e rejeita URL ausente/insegura |

Sem uma chave válida do provedor selecionado, somente os recursos de IA ficam indisponíveis. Nunca versione `.env`, chaves, senhas ou URLs de banco. O preflight de produção exige um proxy confiável porque o Next.js não fornece o endereço de rede direto de forma confiável; não exponha a porta da aplicação fora desse proxy.

Antes de publicar, valide o ambiente:

```bash
NODE_ENV=production npm run check:production-env
```

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor local de desenvolvimento |
| `npm run build` | Build otimizado de produção |
| `npm run start` | Servidor de produção após o build |
| `npm run lint` | ESLint com zero warnings permitidos |
| `npm run typecheck` | Verificação TypeScript sem emissão |
| `npm run test` | Testes unitários em execução única |
| `npm run check` | Lint, typecheck, testes e validação Prisma |
| `npm run audit:prod` | Auditoria das dependências de produção |
| `npm run db:push` | Sincroniza o schema Prisma com o MongoDB |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run migrate:accounts` | Cria/promove o owner e migra dados legados |
| `npm run verify:migration` | Verifica a integridade da migração sem escrever |
| `npm run cap:sync` | Sincroniza o projeto web com Android |

O smoke test real de autenticação é opt-in e não contém credenciais:

```bash
RUN_DB_TESTS=true TEST_OWNER_USERNAME='owner' TEST_OWNER_PASSWORD='senha' \
  node --env-file=.env ./node_modules/vitest/vitest.mjs run tests/auth-database.integration.test.ts
```

## Arquitetura

```text
app/
├── (dashboard)/        páginas protegidas
├── api/                Route Handlers protegidos por route()
└── login/              fluxo público de autenticação
lib/
├── auth.ts             credenciais, sessões persistidas e RBAC
├── password.ts         hashing e verificação scrypt
├── route.ts            auth, origem, rate limit e erros de API
├── validation.ts       schemas Zod
├── rate-limit.ts       Upstash Redis opcional com fallback local
├── ai.ts               provedores e limites de IA
└── services/           acesso Prisma escopado por ownerId
prisma/schema.prisma    contas, sessões e modelos multiusuário
scripts/                preflight, migração e verificações operacionais
proxy.ts                gate otimista do Next.js 16
```

O service worker armazena somente assets públicos; HTML, RSC e respostas autenticadas não são persistidos. O Android exige HTTPS remoto, desabilita cleartext, backup e mixed content.

## Deploy

Use um runtime Node.js compatível com Next.js 16. Configure as variáveis no provedor, execute `npm run check:production-env`, `npm run check`, `npm run audit:prod` e `npm run build`, e então sincronize o schema com o banco correto. Em produção distribuída, configure Upstash Redis para que o rate limit não dependa da memória de uma única instância.

## Licença

MIT.
