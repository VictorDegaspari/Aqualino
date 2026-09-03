# ADR 0004 — Widget nativo alimentado por snapshot

- Status: aceito
- Data: 2026-09-02

## Decisão

Usar WidgetKit/SwiftUI no iOS e Jetpack Glance/Kotlin no Android. O React Native grava um JSON sem dados pessoais em armazenamento compartilhado por um Turbo Native Module pequeno. O toque usa deep link; registro direto fica para a fase 6.

## Consequências

O widget funciona com o app fechado e sem polling de rede. O sistema operacional decide o momento de atualizações periódicas. Mudanças de schema exigem incremento de `schema_version` e fallback seguro.

