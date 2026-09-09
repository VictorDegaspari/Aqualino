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
- `PATCH /groups/current/settings` — `{photo_review_enabled}`, somente líder
- `GET /groups/current/reviews?page=1`
- `POST /hydration/logs/{id}/votes` — `{vote: "valid" | "invalid"}`
- `GET /hydration/logs/{id}/photo` — imagem privada autenticada

O contrato está em `packages/contracts/openapi.yaml`. O responsável inicia a primeira rodada pela Home, na aba Grupo, com pelo menos duas pessoas. A Home e a aba Equipes exibem o placar real, as regras e o último resultado. O elenco e a meta individual ficam fixos na largada; os pontos são comparados em centésimos e os empates usam posições como 1º, 1º, 3º. A rodada tem sete dias civis no fuso do grupo e 15 minutos finais para sincronização, e aguarda também o encerramento das votações abertas antes da confirmação das medalhas e dos sorteios dos primeiros colocados (70% XP, 20% congelamento, 10% reacender). A próxima rodada começa automaticamente ao final da janela, se houver pelo menos duas pessoas.

O comando `groups:advance-challenges`, executado a cada minuto pelo scheduler, fixa os participantes, fecha os resultados e concede os prêmios de forma idempotente. Consultas e mudanças do grupo também reconciliam esses estados. O histórico usa soft deletes. Avatar do grupo, remoção de integrantes, transferência manual e convites por deep link permanecem para os próximos incrementos.

## Validação

Na raiz, com Node 22 no PATH:

```sh
pnpm --filter @aqualino/mobile test -- src/features/groups __tests__/App.test.tsx
pnpm --filter @aqualino/mobile exec eslint src/features/groups
pnpm -r typecheck
pnpm openapi:lint
```

A API requer as migrations de grupos, `2026_09_07_161529_add_group_challenge_scoring.php` e `2026_09_07_171627_add_hydration_photo_reviews.php`. No ambiente local, fotos ficam no volume persistente privado `hydration_photos`. Para atualizar a API Docker local, que copia o código para a imagem:

```sh
docker compose build api horizon scheduler
docker compose run --rm --no-deps api php artisan migrate --force
docker compose up -d --no-deps api horizon scheduler
docker compose exec nginx nginx -s reload
```

Os testes de backend ficam em `apps/api/tests/Feature/GroupControllerTest.php` e `apps/api/tests/Feature/GroupChallengeTest.php`. Execute em um banco de testes isolado; nunca use `migrate:fresh` no banco de desenvolvimento.

### Próxima implementação: fotos privadas no Cloudflare R2

Em produção, as fotos de marcações devem migrar para um bucket R2 privado, na classe Standard. A API continuará validando a imagem e enviando o arquivo; o aplicativo não receberá permissão de escrita direta no bucket. O endpoint autenticado `GET /hydration/logs/{id}/photo` continuará aplicando a elegibilidade e poderá devolver uma URL de leitura assinada de curta duração, limitada a cinco minutos.

Cada foto será removida 14 dias após o envio. Um job diário apagará o objeto e limpará sua referência no banco; uma regra de ciclo de vida para o prefixo `hydration/`, com expiração em 21 dias, cobrirá objetos órfãos. A exclusão da conta também deverá remover as fotos imediatamente. A classe Standard é adequada para essa retenção curta; Infrequent Access exige permanência mínima de 30 dias.

## Revisão de marcações

A votação começa habilitada. O líder pode desabilitar ou habilitar novos envios; o prazo e os votos de marcações já recebidas permanecem. Só grupos com pelo menos três pessoas abrem votação. O autor não vota. A lista dos outros integrantes é fixada por marcação e exige maioria estrita: dois inválidos entre quatro elegíveis não anulam, três anulam. Quem sai perde acesso a novos votos; votos já registrados e o total elegível permanecem. Novos integrantes não acessam fotos anteriores.

A janela é de 12 horas a partir do recebimento na API, inclusive para registros offline. Um voto por pessoa, definitivo; repetir a mesma requisição não duplica. As marcações são válidas enquanto aguardam a maioria. Anular mantém o histórico e recalcula água, bônus, XP, sequência e desafios; o nível já conquistado segue a política de nível permanente existente. Prêmios solo e em grupo aguardam as revisões relevantes.

Todos os modos compartilham 15 marcações por dia civil do perfil e 900 segundos entre registros. Anulações e soft deletes não devolvem a vaga. A API verifica ambos os lados do intervalo para envios offline fora de ordem, com bloqueio transacional por usuário. O app mostra limites e horário de liberação e preserva foto, volume, horário confiável e idempotência na fila offline por conta. Esses limites são regras do aplicativo, não recomendações de consumo.

Filas anteriores em `aqualino.sqlite` não têm autoria confiável. A Home oferece recuperação somente se houver pendências e pede ao usuário que as vincule à conta correta; cancelar mantém o arquivo. Novas filas ficam em `aqualino-<userId>.sqlite`, com fotos removidas após confirmação. A migração enfileira antes de retirar da origem e preserva o UUID para retries idempotentes.
