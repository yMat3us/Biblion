# Performance: orçamento e práticas

Metas para manter o Biblion rápido e barato de operar. Números são orçamentos
(alvos), não SLAs contratuais — servem para orientar decisões e disparar revisão
quando estourados.

## Orçamento de resposta (servidor)

| Superfície                          | Alvo p95         |
| ----------------------------------- | ---------------- |
| Listagens (sermões/esboços/notas)   | < 300 ms         |
| Detalhe/leitura (plano, capítulo)   | < 400 ms         |
| Catálogo público                    | < 400 ms         |
| Contagem de não lidas (sino)        | < 150 ms         |
| Geração de IA (one-shot)            | depende do modelo (logada) |

## Payload e dados

- **Projeção mínima** nas listagens: nunca trazer corpos grandes (sermão até
  ~200KB) no card. `select` explícito por card (Etapa 4.1).
- **Paginação por cursor** (`lib/pagination.ts`): página padrão 60, teto 100. As
  listagens são limitadas — sem varredura de coleção inteira.
- **Busca server-side** disponível nas listas (`?q=`) e no catálogo (índice de
  texto do MongoDB).

## Cache (read-through, config-gated por Redis)

- Bíblia (por capítulo) e hinário: TTL 1h + cache L1 em processo.
- Catálogo (categorias): TTL 5 min.
- Contagem de não lidas: TTL 15s + invalidação em toda mutação.
- Sem Redis: tudo degrada para a origem (sem cache), sem quebrar.

## Bundle (client)

- **react-markdown + remark-gfm** carregados sob demanda via `next/dynamic`
  (`components/ui/Markdown.tsx`), fora do bundle inicial das páginas que os usam.
- Componente de mídia (avatar) servido por URL/CDN quando há object storage.
- Orçamento sugerido: First Load JS por rota **< 300 KB**. Reveja ao adicionar
  dependências pesadas; prefira `next/dynamic` para o que não é crítico.

## Resiliência de rede (client)

- `apiFetch` (`lib/api-fetch.ts`): timeout por tentativa, retry só em GET/HEAD,
  normalização de erro. Evita requisições penduradas e falhas transitórias.
- Tempo real via SSE com **fallback a polling**; o polling desacelera quando o
  SSE está conectado.

## Custo e observabilidade de IA

- Toda chamada de IA registra `ai_usage` (tokens de entrada/saída, custo estimado
  em USD, duração) via `lib/observability.ts`. Use para alertas de custo.
- `measure()` instrumenta a duração de operações sensíveis.
- Preços são aproximados (tabela em `observability.ts`); ajuste por provedor.

## Verificação de carga

- `scripts/load-test.k6.js` (k6): valida os orçamentos acima sob carga. Requer um
  servidor de teste e credenciais de teste (nunca rode contra produção com dados
  reais). Ver o cabeçalho do script para uso e thresholds.
