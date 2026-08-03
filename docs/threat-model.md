# Threat Model — Biblion

Modelo de ameaças vivo do Biblion. Não promete "100% seguro"; documenta ativos,
fronteiras de confiança, ameaças (STRIDE) e os controles implementados, em
defesa em profundidade. Atualize junto com mudanças de arquitetura.

## Visão geral e fronteiras de confiança

```
Navegador (não confiável)
   │  HTTPS
   ▼
proxy.ts (Node) ── redireciona páginas sem cookie + injeta CSP com nonce
   │
   ▼
route() (fronteira de API) ── auth + origem (CSRF) + rate limit + validação de ObjectId + no-store
   │
   ▼
Serviços server-only ── escopo por ownerId (404 anti-enumeração) + Zod
   │
   ▼
Prisma / MongoDB (Atlas)        Externos: provedor de IA, Upstash Redis, HIBP
```

Fronteiras: navegador↔servidor (toda entrada é não confiável); servidor↔banco;
servidor↔serviços externos (IA/Redis/HIBP). Segredos vivem só no ambiente do
servidor e são marcados com `experimental.taint` para não cruzarem ao client.

## Ativos

- Credenciais (hash scrypt; nunca em texto claro nem em logs).
- Sessões (token opaco; só o hash SHA-256 é persistido).
- Conteúdo do usuário (sermões, esboços, anotações, planos, EBD, mensagens).
- PII de perfil e grafo social (amizades, bloqueios, conversas).
- Segredos de ambiente (DATABASE_URL, chaves de IA, token Redis).

## Atores

- Anônimo (só `POST /api/auth/login` e `/api/csp-report`).
- Usuário autenticado (escopo aos próprios recursos).
- Segundo usuário / atacante autenticado (tentando IDOR).
- OWNER/ADMIN (RBAC global; gestão de contas).

## Ameaças (STRIDE) e controles

### Spoofing / autenticação
- Sessão opaca no banco; hash SHA-256 do token; cookie HttpOnly + `SameSite=Lax`
  + `Secure`/prefixo `__Host-` em produção (`lib/auth-constants.ts`, `lib/auth.ts`).
- Inatividade deslizante + teto absoluto + invalidação por anomalia de User-Agent.
- Anti-brute-force por falhas (não por tentativas): bloqueio por IP, backoff por
  conta só em falha, reset no sucesso — credencial válida nunca é bloqueada
  (`app/api/auth/login/route.ts`, `lib/rate-limit.ts`).
- Política de senha: blocklist local sempre ativa + HIBP opcional fail-open
  (`lib/password-policy.ts`).

### Tampering / CSRF
- `route()` valida origem (`Origin`/`Sec-Fetch-Site`) em métodos mutáveis.
- CSP com nonce por requisição, sem `'unsafe-inline'` em `script-src` (`proxy.ts`).
- Cabeçalhos de segurança em `next.config.ts` (nosniff, X-Frame-Options, COOP/CORP,
  Referrer-Policy, HSTS em produção).

### Repudiation / auditoria
- Logger estruturado com redação de token/PII (`lib/logger.ts`).
- CSP report-uri → `/api/csp-report` (monitoramento de violações).
- (Auditoria imutável de ações administrativas: prevista para a Etapa 5.)

### Information disclosure / IDOR
- Todo serviço escopa por `ownerId`; recurso alheio retorna 404 (anti-enumeração),
  provado exaustivamente em `tests/idor.test.ts` e `tests/ownership.test.ts`.
- Selects/DTOs mínimos: `passwordHash`/`tokenHash`/`authVersion` nunca saem ao client.
- `experimental.taint` marca segredos de ambiente como não serializáveis (`lib/taint.ts`).

### Denial of service / abuso
- Rate limits por rota (IP + conta) via `RateLimits` (Upstash Redis com fallback local).
- Caps de payload (413) no tutor de IA; caps de conteúdo por mensagem.
- Limites dedicados para ações sociais e mensagens; teto de solicitações pendentes.

### Elevation of privilege
- RBAC OWNER/ADMIN/MEMBER; ADMIN não gerencia OWNER/ADMIN; owner principal imutável
  (`lib/services/user.ts`, `tests/user-service.test.ts`).
- `ownerId` é sempre injetado pelo servidor na criação (ignora `ownerId` forjado).

## Riscos aceitos / limitações conhecidas

- Rotação de token no meio da sessão não é feita (arquitetura RSC + sessão opaca já
  dá revogação instantânea; idle+absoluto+anomalia de UA limitam token roubado).
- Anomalia de UA é leniente (compara família, não versão) para não deslogar em
  atualização de navegador.
- HIBP é fail-open: indisponibilidade não bloqueia troca/criação de senha.
- CSP: a 404 estática pode ter JS bloqueado (funciona via links); `style-src`
  mantém `'unsafe-inline'` (atributos de estilo do tema/avatar).
- `experimental.taint` roda no canal experimental do React (reversível).

## Pré-requisitos operacionais

- `NODE_ENV=production npm run check:production-env` (exige Redis, TRUST_PROXY, HTTPS).
- Proteção de branch exigindo os checks de CI (ver `docs/pentest-checklist.md`).
