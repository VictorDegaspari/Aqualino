# ADR 0004 — Widget nativo alimentado por snapshot

- Status: aceito
- Data: 2026-09-02

## Decisão

Usar WidgetKit/SwiftUI no iOS e Jetpack Glance/Kotlin no Android. O React Native grava um JSON sem dados pessoais em armazenamento compartilhado por um Turbo Native Module pequeno. O toque usa deep link; registro direto fica para a fase 6.

## Consequências

O widget funciona com o app fechado e sem polling de rede. O sistema operacional decide o momento de atualizações periódicas. Mudanças de schema exigem incremento de `schema_version` e fallback seguro.

## Evolução do snapshot

A versão 2 acrescenta `current_streak`, usado no título e na janela móvel dos cinco dias mais recentes. O app regrava o snapshot ao carregar a Home e depois de cada registro, permitindo que widgets instalados migrem sem polling próprio. Android e iOS descartam versões incompatíveis e apresentam um estado inicial seguro.

## Referência operacional

A arquitetura detalhada, o contrato do snapshot, os estados visuais, a configuração de cada plataforma e o roteiro de diagnóstico ficam em [`apps/mobile/src/features/widget/README.md`](../../apps/mobile/src/features/widget/README.md).
