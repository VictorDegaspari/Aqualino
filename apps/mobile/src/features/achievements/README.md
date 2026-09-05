# Conquistas do perfil

O perfil apresenta quatro destaques. As conquistas desbloqueadas vêm primeiro, da maior prioridade para a menor; vagas restantes mostram os primeiros marcos ainda disponíveis. Tocar no painel abre a coleção completa, com filtros, requisitos, progresso e data do desbloqueio.

| Código | Conquista | Critério | Prioridade |
| --- | --- | --- | --- |
| `first_drop` | Primeira gota | Primeiro registro de água aceito pela API | 10 |
| `first_reminder` | Na hora certa | Primeiro lembrete agendado com sucesso no aparelho | 20 |
| `first_goal` | Dia completo | Primeira meta diária alcançada | 30 |
| `team_player` | Em equipe | Criar ou entrar no primeiro grupo | 40 |
| `streak_3` | Em ritmo | Maior sequência de hidratação de 3 dias | 50 |
| `streak_7` | Semana azul | Maior sequência de 7 dias | 60 |
| `goals_7` | Sete dias de cuidado | Meta alcançada em 7 dias distintos, consecutivos ou não | 70 |
| `streak_14` | Maré constante | Maior sequência de 14 dias | 80 |
| `goals_30` | Oceano de cuidado | Meta alcançada em 30 dias distintos, consecutivos ou não | 90 |
| `streak_30` | Guardião das gotas | Maior sequência de 30 dias | 100 |

## Persistência e eventos

- A API mantém `user_achievements` com unicidade por perfil e código. As conquistas são permanentes, mesmo após sair de uma equipe ou perder uma sequência. A exclusão da conta remove suas conquistas.
- Hidratação e grupos liberam conquistas junto ao fluxo correspondente. `GET /achievements` também reconhece marcos já presentes no histórico, sem gerar XP adicional.
- As sequências usam o cálculo existente da aplicação, incluindo proteções de sequência válidas. As metas usam os dias civis registrados pelo servidor.
- Lembretes são nativos: o aplicativo registra `reminder_created` somente após o agendamento. A API aceita esse evento restrito e não permite códigos ou progresso enviados pelo cliente.
- Sem conexão, o primeiro lembrete aparece imediatamente e fica pendente por conta no MMKV. Ao reconectar, sincroniza o desbloqueio antes de confirmar a celebração. Falhas mantêm a pendência para nova tentativa.
- O catálogo remoto fica no React Query e possui uma cópia local por usuário. Respostas atrasadas não atualizam o perfil de outra conta. Lembretes antigos sem vínculo de conta não são atribuídos retroativamente.

## Celebração e navegação

Cada novo desbloqueio entra em uma fila global de modais, com entrada por mola, flutuação da medalha, saída suave e retorno tátil. O usuário pode fechar imediatamente. O modal respeita movimento reduzido e leitores de tela; a fila aguarda o fechamento dos detalhes e o aplicativo estar em primeiro plano.

Fechar grava a visualização localmente e confirma `POST /achievements/{code}/celebration`. A confirmação idempotente evita repetição em sessões futuras. Dois aparelhos simultaneamente desconectados podem celebrar a mesma conquista antes de sincronizar a confirmação.

A coleção usa uma rota transparente sobre o perfil. O gesto horizontal movimenta a tela inteira na thread de interface. Soltar após 32% da largura, ou após 32 pontos com velocidade acima de 650 pontos/s, conclui o retorno; movimentos curtos ou cancelados voltam por mola. A rolagem vertical, o botão visível e o voltar do Android continuam disponíveis.

## Arte

Dez PNGs com transparência real em `../../assets/achievements/`, gerados com a ferramenta integrada de imagens. O [conjunto de prompts](../../assets/achievements/prompts.json) registra as instruções usadas; `achievementImages.ts` associa cada arte ao código. Textos são renderizados pelo aplicativo em português e inglês, sem depender de letras nas imagens.

## Validação

`AchievementControllerTest` cobre critérios, idempotência, isolamento de perfis, eventos inválidos, integrações e exclusão da conta. Os testes mobile cobrem destaques, filtros, detalhes, celebrações, lembretes, sincronização e gesto interativo.

Depois de atualizar a API, execute `php artisan migrate` antes de abrir esta versão do aplicativo.
