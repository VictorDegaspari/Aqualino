# Arquitetura

```text
React Native (Query + SQLite outbox)
        | HTTPS / JSON
        v
Nginx -> Laravel modular -> PostgreSQL
              |                 ^
              v                 |
        Redis/Horizon -> transactional outbox

React Native -> TurboModule -> snapshot local -> WidgetKit / Glance
```

Instantes são persistidos em UTC. Datas civis são calculadas no fuso IANA do perfil. A API é a única responsável por XP, sequência e condição do mascote. A resposta do registro contém tudo que a Home e o widget precisam reconciliar imediatamente.

