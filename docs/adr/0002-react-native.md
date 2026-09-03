# ADR 0002 — React Native com código nativo versionado

- Status: aceito
- Data: 2026-09-02

## Decisão

Usar React Native 0.87 com TypeScript, Node 22 e New Architecture. Manter `ios/` e `android/` no repositório. TanStack Query trata estado remoto; Zustand guarda somente sessão visual; SQLite mantém a outbox offline; Keychain/Keystore protege tokens.

## Consequências

Widgets e a ponte de snapshot podem usar APIs oficiais de cada plataforma. O ambiente exige Xcode no macOS para iOS e JDK 17/Android SDK para Android.

