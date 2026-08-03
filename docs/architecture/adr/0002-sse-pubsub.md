# ADR 0002 — Tempo real via SSE + Redis pub/sub, com polling de fallback

Status: aceito (Etapa 3)

## Contexto

Chat e sino de notificações usavam polling (4s no chat, 25s no sino), gerando
tráfego e latência. Queríamos push em tempo real sem sacrificar robustez nem
exigir infraestrutura obrigatória.

## Decisão

- Endpoint **SSE** `/api/stream` (autenticado por `route()`), um canal por usuário
  (`user:<id>`), com heartbeat. `runtime = nodejs` (conexão longa).
- **Bus** (`lib/events/bus.ts`) com dois backends, um por vez: **Redis pub/sub**
  (Upstash) para fan-out entre instâncias; **EventEmitter** em processo como
  fallback de instância única. Publicação/assinatura best-effort.
- O outbox publica no bus após criar a notificação.
- Client: hook `useLiveEvents` (EventSource) que dispara refetch; **o polling
  permanece como fallback** e desacelera (20s) quando o SSE está conectado.

Escolhemos SSE (não WebSocket) por ser unidirecional (servidor→client), simples
sobre HTTP e com reconexão nativa do `EventSource`.

## Consequências

- (+) Atualizações quase instantâneas quando há SSE/Redis; correção garantida
  sempre (polling de rede de segurança); zero dependência obrigatória.
- (−) SSE de longa duração pede runtime adequado (standalone/Node ideal; em
  serverless reconecta ao atingir `maxDuration`). Assinatura via REST do Upstash
  mantém uma conexão por usuário — aceitável na escala atual.
