# Escala e operação

O Biblion escala **horizontalmente** (várias instâncias atrás de um balanceador).
Este documento reúne o que torna isso possível e os pontos de atenção.

## Estado: as instâncias são (quase) sem estado

- **Sessões** ficam no banco (`UserSession`), não em memória — qualquer instância
  valida qualquer sessão. Deslizamento por inatividade + teto absoluto + rotação.
- **Rate limit / anti-brute-force** usam Redis (Upstash) quando configurado, com
  fallback em memória por instância. Com múltiplas instâncias, **configure o
  Redis** — sem ele, os limites são por instância (mais frouxos no agregado).
- **Cache em processo** (Bíblia/hinos) é por instância e se reconstrói sozinho;
  não é fonte da verdade.

## Pooling de conexões (MongoDB)

- `PrismaClient` é **singleton por processo** (`lib/prisma.ts`), reaproveitado
  entre requests.
- O pool é dimensionado na connection string (`maxPoolSize`, `minPoolSize`,
  `maxIdleTimeMS`). O total de conexões no cluster ≈ **nº de instâncias ×
  maxPoolSize** — ajuste para não estourar o limite do plano do Atlas.
- Em serverless, prefira `maxPoolSize` baixo (ex.: 1–5) por invocação e considere
  o proxy de conexões do provedor.

## Tempo real (SSE + pub/sub)

- `/api/stream` mantém conexões longas (SSE). Exige runtime de conexão longa: o
  deploy **standalone (Node/Docker)** suporta direto. Em serverless, o cliente
  reconecta ao atingir `maxDuration` — quedas periódicas são transparentes.
- O fan-out entre instâncias usa **Redis pub/sub**. Sem Redis, o bus é um
  `EventEmitter` em processo (ok só para instância única). O client sempre tem o
  **polling como fallback**.

## Trabalho assíncrono (outbox + cron)

- Efeitos colaterais (notificações) passam por um **outbox transacional**;
  a entrega roda fora do request (via `after()`) e o cron reentrega o que falhar.
- Rotas internas (`/api/internal/*`) são acionadas por um agendador (Vercel Cron
  ou cron self-hosted) e autenticadas por `CRON_SECRET`. São idempotentes.

## Conteúdo e mídia

- **Bíblia/hinos**: migráveis do filesystem para o Mongo (`CONTENT_SOURCE=mongo`),
  com cache por capítulo e fallback ao fs. Elimina I/O de arquivo em runtime e o
  `outputFileTracingIncludes` depois de semeados.
- **Avatares/capas**: vão para object storage (S3/R2) quando configurado; o banco
  guarda só a URL pública (servida por CDN), removendo base64 pesado das leituras.

## Checklist ao escalar para N instâncias

1. Configure **Redis** (rate limit consistente + pub/sub do SSE).
2. Ajuste **`maxPoolSize`** conforme o nº de instâncias e o limite do cluster.
3. Garanta **um único** agendador disparando os crons internos (evita corrida;
   o outbox é idempotente, mas não precisa de disparos redundantes).
4. Migre mídia para **object storage** e conteúdo para **Mongo** (leituras mais
   leves; menos pressão de memória/CPU por instância).
5. Prefira o deploy **standalone (Node)** para SSE de longa duração.
