# ADR 0003 — Monólito modular Laravel

- Status: aceito
- Data: 2026-09-02

## Decisão

Usar Laravel 13/PHP 8.4 como um único processo e banco, separando os módulos Identity, Hydration, Gamification e Widget por domínio. PostgreSQL é a fonte de verdade; Redis é usado para filas, cache, locks e rate limit.

## Consequências

Operações críticas são transacionais e fáceis de implantar. Eventos assíncronos duráveis entram na tabela outbox antes de serem processados pelo Horizon. Não há microserviços no MVP.

