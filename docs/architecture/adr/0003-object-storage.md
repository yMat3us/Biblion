# ADR 0003 — Avatares em object storage (config-gated), SigV4 sem SDK

Status: aceito (Etapa 3)

## Contexto

Avatares eram armazenados como data URL base64 (até ~1,5MB) no documento do
usuário. Isso pesava em toda leitura de perfil e inflava o banco. Queríamos mover
a mídia para object storage (S3/R2) sem quebrar quem ainda não configurou storage.

## Decisão

- `lib/storage.ts`: adaptador compatível com S3 (AWS/R2/MinIO), **config-gated**
  por `STORAGE_*`. Sem config, `storageConfigured()` é false e mantém-se o base64
  (fallback).
- Com storage, `updateProfile` faz **ingest server-side** do data URL: decodifica,
  sobe ao bucket e persiste só a **URL pública** (HTTPS, já aceita pela validação).
- Assinatura **SigV4 feita à mão** (só `node:crypto`) — sem SDK/dependência nativa,
  determinística e testável.
- Migração dos avatares legados: rota interna `/api/internal/migrate-avatars`
  (idempotente, em lote), reusando o adaptador.

## Consequências

- (+) Leituras de perfil leves; banco menor; mídia servível por CDN; zero dep nova;
  ativação sem downtime (fallback preserva o comportamento atual).
- (−) **Thumbnail server-side não implementado**: exigiria uma dependência nativa
  (ex.: `sharp`) e, com ingest server-side, o ponto natural para isso é
  `ingestDataUrlToStorage`. Fica como melhoria futura (a imagem já é limitada no
  client). Objetos antigos não são apagados na troca de avatar (limpeza futura).
