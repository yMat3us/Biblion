# ADR 0006 — Fronteiras de módulo do monólito modular

Status: aceito (Etapa 3)

## Contexto

O código já tinha camadas (rotas → serviços → dados), mas nada impedia violá-las:
um componente de client poderia importar o Prisma, ou um serviço poderia depender
da camada HTTP, criando acoplamento e risco de vazar acesso a dados para o browser.

## Decisão

Reforçar as fronteiras por dois mecanismos complementares:

1. **`server-only` como pedra angular** em `lib/prisma.ts`. Como todo serviço/lib
   de dados importa o Prisma, qualquer vazamento de acesso a dados para um bundle
   de client **quebra o build** — verificação em tempo de compilação e ciente de
   contexto (server vs client). É a proteção primária da fronteira client/DB.
2. **ESLint `no-restricted-imports`** em `lib/services/**`: proíbe importar
   `@/lib/route`, `next/server` e `@/app/*`. Mantém os serviços agnósticos de
   transporte e impede inversão de dependência.

Documentação em `modules.md`. Não adotamos uma ferramenta de "boundaries" pesada
(dependency-cruiser etc.) — as duas regras cobrem os riscos reais com custo zero.

## Consequências

- (+) Vazamento de acesso a dados para o client é impossível de compilar; serviços
  permanecem testáveis e reutilizáveis; direção de dependência garantida.
- (−) Enforcement parcial via ESLint (só a camada de serviços). A fronteira
  client↔servidor depende do `server-only`, que é suficiente para o caso crítico.
