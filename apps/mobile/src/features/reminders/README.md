# Lembretes de hidratação

Esta feature permite criar até oito lembretes locais, escolher o horário e os dias da semana, pausar, reativar e remover cada configuração. Os dados ficam no aparelho e os avisos são agendados nas APIs nativas por meio do Notifee.

## Componentes

- `presentation/RemindersView.tsx`: formulário, seleção dos dias, validações e cartões dos lembretes.
- `presentation/RemindersScreen.tsx`: coordena estado, mensagens, confirmação de remoção e permissões.
- `application/reminderStore.ts`: persiste as configurações no MMKV e mantém o agendamento nativo consistente.
- `application/reminderNotificationService.ts`: solicita permissões, cria o canal Android e agenda ou cancela gatilhos.
- `application/reminderWeekdays.ts`: normaliza, ordena e formata os dias da semana.
- `application/reminderBackgroundHandler.ts`: registra o `onBackgroundEvent` como efeito colateral antecipado do ponto de entrada.
- `index.js`: importa o handler antes da árvore React ser carregada, inclusive nas execuções headless.

## Modelo persistido

```ts
interface HydrationReminder {
  id: string;
  hour: number;
  minute: number;
  weekdays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  enabled: boolean;
}
```

Os números seguem `Date#getDay`: domingo é `0`, segunda é `1` e sábado é `6`. Na interface e na persistência, a ordem normalizada é segunda a domingo: `[1, 2, 3, 4, 5, 6, 0]`.

O MMKV usa o namespace `aqualino.reminders` e mantém a chave histórica `hydration.dailyReminders`. Registros de versões anteriores que não possuem `weekdays` são carregados como “Todos os dias”; valores inválidos ou uma lista vazia são descartados.

## Agendamento nativo

Para economizar gatilhos nativos, existem duas estratégias:

| Seleção | Recorrência Notifee | Quantidade de gatilhos |
| --- | --- | --- |
| Todos os sete dias | `RepeatFrequency.DAILY` | 1 |
| Um subconjunto dos dias | `RepeatFrequency.WEEKLY` | 1 por dia selecionado |

O gatilho diário usa o identificador `hydration-reminder-<id>`. Cada gatilho semanal usa `hydration-reminder-<id>-weekday-<dia>`. Ao pausar ou remover, o serviço cancela o identificador diário/legado e todos os possíveis identificadores semanais. Isso também evita notificações duplicadas após uma atualização.

Se parte de um agendamento falhar, todos os gatilhos daquele lembrete são cancelados e a configuração não é persistida. A data inicial de cada gatilho é calculada no fuso local do aparelho; um horário já passado avança para o próximo dia ou para a semana seguinte.

## Permissões

- A permissão de notificações é solicitada apenas quando o usuário salva ou reativa um lembrete.
- No Android, alarmes exatos usam `SET_EXACT_AND_ALLOW_WHILE_IDLE`. Se o acesso especial estiver desativado, a tela oferece “Abrir ajustes”.
- No iOS, o mesmo fluxo solicita alertas e som e usa gatilhos de calendário fornecidos pelo Notifee.
- O handler em segundo plano é intencionalmente vazio: as notificações atuais não possuem ações que alterem dados, mas o registro é obrigatório para que eventos de toque ou dispensa sejam reconhecidos sem warnings.

## Fluxos de consistência

1. Criar: valida horário e dias, agenda os gatilhos e só então salva no MMKV.
2. Pausar: cancela todos os gatilhos antes de marcar o lembrete como inativo.
3. Reativar: recria os gatilhos dos dias persistidos antes de marcar como ativo.
4. Remover: cancela os gatilhos antes de excluir a configuração local.

## Testes

Os testes cobrem seleção e validação dos dias, rótulos de recorrência, cálculo da próxima ocorrência, estratégia diária/semanal e cancelamento dos identificadores nativos.

```sh
pnpm --filter @aqualino/mobile typecheck
pnpm --filter @aqualino/mobile lint
pnpm --filter @aqualino/mobile test
```
