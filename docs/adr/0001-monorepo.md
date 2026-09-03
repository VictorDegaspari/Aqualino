# ADR 0001 — Monorepo sem orquestrador adicional

- Status: aceito
- Data: 2026-09-02

## Decisão

Manter API Laravel, app React Native, contratos e tokens no mesmo repositório. `pnpm` gerencia somente os workspaces JavaScript. Composer permanece isolado em `apps/api`. Não usar Turborepo nesta fase.

## Consequências

Contratos e tokens podem ser compartilhados e o CI pode filtrar caminhos. O build nativo e a API continuam com ferramentas próprias, sem uma camada de cache/orquestração ainda sem retorno mensurável.

