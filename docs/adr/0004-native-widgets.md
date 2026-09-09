# ADR 0004 — Widget nativo alimentado por snapshot

- Status: aceito
- Data: 2026-09-02

## Decisão

Usar WidgetKit/SwiftUI no iOS e Jetpack Glance/Kotlin no Android. O React Native grava um JSON sem dados pessoais em armazenamento compartilhado por um Turbo Native Module pequeno. O toque usa deep link; registro direto fica para a fase 6.

## Consequências

O widget funciona com o app fechado e sem polling de rede. O sistema operacional decide o momento de atualizações periódicas. Mudanças de schema exigem incremento de `schema_version` e fallback seguro.

## Evolução do snapshot

A versão 2 acrescenta `current_streak`, usado no título e nos checks da faixa de cinco dias da semana atual. A faixa reinicia pela segunda-feira após domingo e avança da esquerda para a direita; no fim de semana, desloca-se para incluir sábado e domingo. `generated_at` ancora os checks à data do snapshot, evitando transportar o registro de domingo para a segunda-feira. O app regrava o snapshot ao carregar a Home e depois de cada registro, permitindo que widgets instalados migrem sem polling próprio. Android e iOS descartam versões incompatíveis e apresentam um estado inicial seguro.

A versão 3 acrescenta `frozen_dates`, com as datas locais protegidas por congelamento na semana atual. Elas usam gotas congeladas azuis e interrompem as cápsulas de dias normais. O app migra caches anteriores a partir das proteções conhecidas da semana; a API continua responsável pelo consumo automático.

## Referência operacional

A arquitetura detalhada, o contrato do snapshot, os estados visuais, a configuração de cada plataforma e o roteiro de diagnóstico ficam em [`apps/mobile/src/features/widget/README.md`](../../apps/mobile/src/features/widget/README.md).
