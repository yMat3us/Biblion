# ADR 0004 — Bíblia e hinário no MongoDB, com fallback ao filesystem

Status: aceito (Etapa 3)

## Contexto

Bíblia (13 versões, ~4MB cada) e hinário eram lidos de JSON no filesystem em
runtime, exigindo `outputFileTracingIncludes` no build standalone e mantendo
arquivos grandes em memória. Queríamos servir do banco/CDN sem downtime.

## Decisão

- Modelos `BibleChapter` (um documento por capítulo — leituras pequenas) e `Hino`.
- Loaders (`lib/bible.ts`, `lib/harpa.ts`) config-gated por **`CONTENT_SOURCE`**:
  padrão lê o filesystem (como antes); `=mongo` lê o banco com **fallback ao fs**
  no miss (não semeado). Cache por capítulo/hino em processo.
- Seed idempotente (`ContentSeed` + `/api/internal/seed-content`): apaga o alvo e
  reinsere em massa (`createMany`), um alvo por chamada.

Optamos por documento-por-capítulo (não por livro) porque o Prisma/Mongo não
suporta arrays 2-D bem, e capítulos são a unidade de leitura.

## Consequências

- (+) Migração gradual sem downtime; leituras pequenas e cacheadas; caminho para
  remover o I/O de arquivo em runtime.
- (−) A remoção do fallback fs + `outputFileTracingIncludes` só é segura **após**
  semear e definir `CONTENT_SOURCE=mongo` (ver "flips de infra" no handoff). Um
  capítulo inválido pós-remoção degradaria para 503 em vez de 404 (aceitável).
