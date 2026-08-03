# ADR 0007 — Jobs internos via rotas com segredo + agendador

Status: aceito (Etapa 3)

## Contexto

Sessões expiradas, notificações antigas e eventos de outbox processados se
acumulavam sem expurgo. Também precisávamos de gatilhos para processar o outbox,
semear conteúdo e migrar avatares — tudo máquina-a-máquina, sem sessão de usuário.

## Decisão

- Rotas internas sob `app/api/internal/*`, **fora** do `route()` (que exige sessão
  + CSRF). Autenticação máquina-a-máquina por **`CRON_SECRET`** via
  `assertInternalSecret` (SHA-256 + `timingSafeEqual`, aceita `Authorization:
  Bearer` ou `x-cron-secret`). **Fail-closed**: sem segredo forte, a rota recusa (503).
- Acionadas por um **agendador**: `vercel.json` (Vercel Cron) ou cron self-hosted
  (`curl` com o header). Todas idempotentes.
- Jobs: manutenção (`/cron`), processamento do outbox (`/outbox`), seed de conteúdo
  (`/seed-content`) e migração de avatares (`/migrate-avatars`).

## Consequências

- (+) Expurgo/manutenção automatizados; superfície mínima e segura (segredo forte,
  comparação em tempo constante, fail-closed); portável (Vercel ou self-hosted).
- (−) Requer configurar `CRON_SECRET` e o agendador. Com várias instâncias, garanta
  um único disparo por job (o outbox é idempotente, mas evita trabalho redundante).
