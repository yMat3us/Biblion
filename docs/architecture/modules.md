# Fronteiras de módulo (monólito modular)

O Biblion é um **monólito modular**: um único deploy Next.js, mas com camadas de
responsabilidade bem definidas e dependências que fluem numa direção só. Isso dá
a clareza de microserviços sem o custo operacional deles.

## Camadas e direção das dependências

```
Client Components (browser)
        │  fetch() / EventSource
        ▼
App Router  ──►  route() (lib/route.ts)          camada HTTP / borda
 (app/api, app/**)   auth · CSRF · rate limit · validação
        │
        ▼
Serviços de domínio (lib/services/**)            núcleo, agnóstico de transporte
        │
        ▼
Acesso a dados / infra (lib/prisma, lib/storage, lib/events, lib/redis)
        │
        ▼
MongoDB · Object Storage (S3/R2) · Redis (Upstash)
```

Regra de ouro: **a dependência aponta para baixo**. As rotas chamam serviços; os
serviços nunca conhecem a rota nem o `Request`/`Response`. Componentes de client
nunca acessam o banco — falam com a API.

## Papéis

- **Client Components** (`'use client'`): UI e interação. Buscam dados via `fetch`
  na API e recebem tempo real via `EventSource` (`lib/use-live-events.ts`). Nunca
  importam serviços, Prisma ou segredos.
- **Server Components / Route Handlers** (`app/**`): compõem a resposta. Rotas de
  API passam por `route()` (auth padrão, checagem de origem CSRF, rate limit,
  validação de ObjectId). Chamam serviços e formatam a saída (DTOs mínimos).
- **Serviços** (`lib/services/**`): a lógica de domínio, escopada por `ownerId`
  (404 anti-enumeração). Transporte-agnósticos: lançam `ApiErrors` tipados; quem
  traduz para HTTP é a rota.
- **Infra** (`lib/prisma`, `lib/storage`, `lib/events/*`, `lib/redis`, `lib/auth`):
  acesso a dados, object storage, bus de eventos/outbox, cache e sessão.

## Como as fronteiras são reforçadas

1. **`server-only` como pedra angular.** `lib/prisma.ts` importa `server-only`.
   Como todo serviço e lib de dados importa o Prisma, qualquer tentativa de
   arrastar código de acesso a dados para um bundle de client **quebra o build**.
   É a proteção primária da fronteira client/servidor — verificada em tempo de
   compilação, ciente de contexto (server vs client).

2. **ESLint (`no-restricted-imports`).** Em `lib/services/**`, é proibido importar
   `@/lib/route`, `next/server` ou `@/app/*`. Isso mantém os serviços agnósticos
   de transporte e impede a inversão de dependência (serviço dependendo da borda).

3. **Convenção de DTO.** Selects/DTOs mínimos nos serviços; nenhum campo interno
   (hash de senha, tokenHash, `authVersion`) chega ao client. `experimental.taint`
   marca segredos de ambiente como não-serializáveis (defesa em profundidade).

## Sub-módulos

- `lib/events/` — outbox transacional (`outbox.ts`), bus de tempo real (`bus.ts`)
  e tipos de evento (`types.ts`). Desacopla efeitos colaterais (notificações,
  fan-out SSE) do caminho do request.
- Rotas internas `app/api/internal/**` — máquina-a-máquina (cron, outbox, seed,
  migração), autenticadas por `CRON_SECRET` (não por sessão), via
  `lib/internal-auth.ts`.

## Ao adicionar código novo

- Lógica de negócio nova entra num **serviço**, não no route handler.
- Precisa do banco? Importe `@/lib/prisma` só dentro de `lib/**`.
- Precisa notificar/emitir em tempo real? Emita um evento (`Events.emit`) em vez
  de escrever a notificação no caminho do request.
- Componente de client não importa serviço/Prisma — exponha um endpoint.
