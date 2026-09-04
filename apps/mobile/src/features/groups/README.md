# Equipes privadas

A aba Grupos consulta a equipe da conta atual e permite criar, conferir/aceitar um convite, visualizar os integrantes e sair. O responsável pode compartilhar o convite pelo seletor nativo do aparelho ou gerar outro código. A tela acompanha o idioma configurado (pt-BR/en-US), preserva os formulários em caso de erro e oferece atualização manual e periódica.

O cache remoto usa a chave `['groups', userId, 'current']`. Alterações precisam de conexão, não são colocadas na fila offline e não têm retry automático. Respostas recebidas depois da troca de conta não atualizam o cache. A hidratação continua usando sua fila própria.

A API mantém um grupo por usuário e cinco vagas por grupo com transações, bloqueios e constraints. Os códigos têm 12 caracteres, validade de sete dias, armazenamento criptografado e índice por hash; só o responsável recebe o código. A prévia revela nome, fuso e lotação, sem nomes dos integrantes. Aceitar exige `accept: true`; entrar novamente no mesmo grupo não duplica o vínculo. Ao sair ou excluir a conta, o responsável transfere a equipe ao integrante mais antigo, com um novo convite. O último integrante encerra o grupo.

Endpoints sob `/api/v1`:

- `GET /groups/current`
- `POST /groups` — `{name}`; fuso herdado do perfil
- `POST /groups/invites/preview` — `{code}`
- `POST /groups/invites/accept` — `{code, accept: true}`
- `POST /groups/current/invite`
- `DELETE /groups/current/membership`

O contrato está em `packages/contracts/openapi.yaml`. Esta entrega cobre a formação da equipe. Agendamento e pontuação do desafio de sete dias, avatar do grupo, remoção de integrantes, transferência manual e convites por deep link permanecem para os próximos incrementos; a tela não apresenta placares ou desafios simulados.

## Validação

Na raiz, com Node 22 no PATH:

```sh
pnpm --filter @aqualino/mobile test -- src/features/groups __tests__/App.test.tsx
pnpm --filter @aqualino/mobile exec eslint src/features/groups
pnpm -r typecheck
pnpm openapi:lint
```

A API requer a migration `2026_09_04_224412_create_groups_tables.php`. Para atualizar a API Docker local, que copia o código para a imagem:

```sh
docker compose build api
docker compose up -d --no-deps api
docker compose exec api php artisan migrate
```

Os testes de backend ficam em `apps/api/tests/Feature/GroupControllerTest.php`. Execute em um banco de testes isolado; nunca use `migrate:fresh` no banco de desenvolvimento.
