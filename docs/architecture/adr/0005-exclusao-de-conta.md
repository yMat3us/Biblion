# ADR 0005 — Exclusão de conta por anonimização (LGPD) e integridade referencial

Status: aceito (Etapa 3)

## Contexto

Não havia autoexclusão de conta (direito de eliminação — LGPD). As relações de
conteúdo usavam `onDelete: NoAction`, o que permitiria órfãos num hard-delete.
Um hard-delete do usuário também apagaria mensagens presentes em conversas de
terceiros, corrompendo o histórico do outro participante.

## Decisão

- **Anonimizar** em vez de apagar o registro do usuário: PII zerada (username
  vira tombstone, nome "Usuário removido", bio/avatar/publicId nulos), conta
  desativada, `authVersion++` (revoga sessões), `deletedAt` marcado.
- Apagar o **conteúdo próprio** e o **grafo social**; **apagar o conteúdo das
  mensagens** (`corpo=''`, `deletedAt`) preservando a linha (histórico do outro).
- Tudo numa **transação** em ordem de dependência (`AccountService.deleteAccount`),
  após **reautenticação por senha**. O último owner ativo não pode se autoexcluir.
- Integridade referencial: relações owner de conteúdo passam a `onDelete: Cascade`
  e `Notification.actor` a `onDelete: SetNull` (defesa para hard-deletes futuros).

## Consequências

- (+) Conforme LGPD (dado pessoal eliminado) sem quebrar dados de terceiros;
  sem órfãos.
- (−) A transação interativa exige replica set (Atlas atende; Mongo single-node de
  dev não). O registro anonimizado permanece (tombstone) para manter integridade.
  UI de exclusão fica como follow-up fino (o endpoint self-service já existe).
