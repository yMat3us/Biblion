# ADR 0001 — Outbox de eventos para desacoplar efeitos colaterais

Status: aceito (Etapa 3)

## Contexto

As notificações (amizade, mensagens) eram criadas de forma síncrona no caminho do
request (`NotificationService.notify*`, best-effort). Isso acoplava a latência e a
confiabilidade da ação de domínio à escrita da notificação e não deixava espaço
para fan-out em tempo real ou retentativa.

## Decisão

Introduzir um **outbox transacional** (`OutboxEvent` + `lib/events/outbox.ts`):

- A ação de domínio emite um evento (`Events.emit`) — um insert rápido e durável.
- A entrega roda **fora do request**: `after()` do Next processa logo após a
  resposta; um **cron** (`/api/internal/outbox`) reentrega o que falhar.
- O processador reivindica cada evento atomicamente (janela de visibilidade),
  entrega com **backoff exponencial** e marca `PROCESSED`/`FAILED` (após 6 tentativas).
- Entrega **ao-menos-uma-vez**; os handlers toleram reentrega.

`emit` é **best-effort no boundary**: como a ação de domínio já foi cometida, uma
falha ao enfileirar nunca derruba a resposta (degrada ao comportamento antigo).

## Consequências

- (+) Request mais rápido; notificações confiáveis (durável assim que enfileirado);
  ponto único para fan-out em tempo real (bus) e futuros consumidores.
- (−) Entrega eventualmente consistente (ms a segundos). Sem transação envolvendo
  a mudança de domínio + o enqueue (aceitável: notificações não são críticas). O
  `enqueue(tx)` aceita um cliente de transação para quem quiser garantia forte.
