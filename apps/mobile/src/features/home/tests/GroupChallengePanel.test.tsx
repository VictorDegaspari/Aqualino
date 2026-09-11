import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import type {GroupChallengeRules, HydrationChallenge} from '@aqualino/contracts';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {GroupChallengePanel} from '../presentation/challenge/GroupChallengePanel';
import {GroupChallengeTrophy} from '../presentation/challenge/GroupChallengeTrophy';

const rules: GroupChallengeRules = {
  version: 'group-v3', ranking: 'competition', daily_points_cap: 100, total_points_cap: 700,
  points_decimals: 2, goal_policy: 'shared_daily_goal', daily_goal_ml: 2000, minimum_reward_points: 0.01, sync_grace_minutes: 15,
  rewards: [{type: 'xp', probability: 70, amount: 100}, {type: 'streak_freeze', probability: 20, amount: 1}, {type: 'streak_revive', probability: 10, amount: 1}],
};
const challenge: HydrationChallenge = {
  id: 'first', mode: 'group', status: 'active', starts_at: '2026-09-03T03:00:00Z', ends_at: '2026-09-10T03:00:00Z',
  sync_deadline_at: '2026-09-10T03:15:00Z', rules, participating: true, reward: null,
  progress: {mode: 'challenge', starts_on: '2026-09-03', ends_on: '2026-09-09', timezone: 'America/Sao_Paulo', current_date: '2026-09-09', total_ml: 14000, completed_goal_days: 7, days: []},
  leaderboard: [
    {user_id: 'ana', display_name: 'Ana', avatar_url: null, is_you: true, total_ml: 14000, goal_ml: 2000, percentage: 100, points: 700, rank: 1, tied: true, medal: 'gold'},
    {user_id: 'bia', display_name: 'Bia', avatar_url: null, is_you: false, total_ml: 28000, goal_ml: 4000, percentage: 100, points: 700, rank: 1, tied: true, medal: 'gold'},
    {user_id: 'leo', display_name: 'Léo', avatar_url: null, is_you: false, total_ml: 13000, goal_ml: 2000, percentage: 92.86, points: 650, rank: 3, tied: false, medal: 'bronze'},
  ],
};
const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
  <AppModalProvider>{children}</AppModalProvider>
</SafeAreaProvider>;

test('renders the real tied positions and names, with the complete score on tap', async () => {
  const view = await render(<GroupChallengePanel challenge={challenge} />, {wrapper});
  expect(view.getByLabelText('Ana, você, 1º empatado, 700 pontos')).toBeTruthy();
  expect(view.getByLabelText('Bia, 1º empatado, 700 pontos')).toBeTruthy();
  expect(view.getByLabelText('Léo, 3º lugar, 650 pontos')).toBeTruthy();
  expect(view.queryByText('2º')).toBeNull();
  expect(view.queryByText('4º')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Ver placar completo do grupo'}));
  expect(view.getByText(/Classificação projetada/)).toBeTruthy();
  expect(view.getByText(/28.000 ml · meta de 4.000 ml\/dia/)).toBeTruthy();
});

test('explains the published probabilities and tie rules before starting a challenge', async () => {
  const view = await render(<GroupChallengePanel rules={rules} />, {wrapper});
  expect(view.queryByText('Placar do grupo')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Regras e prêmios'}));
  expect(view.getByText(/1º, 1º, 3º/)).toBeTruthy();
  expect(view.getByText(/2000 ml para todos, independentemente da meta pessoal/)).toBeTruthy();
  expect(view.getByText(/Só é possível entrar no grupo antes do início da primeira rodada/)).toBeTruthy();
  expect(view.getByText(/70%: \+100 XP/)).toBeTruthy();
  expect(view.getByText(/20%: 1 poção de congelamento/)).toBeTruthy();
  expect(view.getByText(/10%: 1 poção de reacender/)).toBeTruthy();
  expect(view.getByText(/24 horas após registrar/)).toBeTruthy();
  expect(view.getByText(/antes da meia-noite no fuso da equipe/)).toBeTruthy();
});

test('keeps a confirmed reward accessible during the next challenge without offering another draw', async () => {
  const result: HydrationChallenge = {...challenge, status: 'completed', reward: {state: 'claimed', type: 'xp', amount: 100}};
  const view = await render(<GroupChallengePanel challenge={{...challenge, id: 'next'}} result={result} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Seu prêmio da rodada anterior'}));
  expect(view.getByRole('header', {name: 'Resultado do grupo'})).toBeTruthy();
  expect(view.getByText(/Seu prêmio já foi recebido: \+100 XP/)).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Abrir baú'})).toBeNull();
});

test('labels the synchronization window and keeps offline rankings provisional', async () => {
  const view = await render(<GroupChallengePanel challenge={{...challenge, status: 'settling'}} offline />, {wrapper});
  expect(view.getByText(/Último placar sincronizado/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Ver placar completo do grupo'}));
  expect(view.getByText(/Aguardando sincronizações e votações até 00:15/)).toBeTruthy();
  expect(view.getByText(/Medalhas ainda provisórias/)).toBeTruthy();
});

test('shows the projected tied medal at the end of the path and confirms it after closing', async () => {
  const view = await render(<GroupChallengeTrophy challenge={challenge} />);
  expect(view.getByLabelText('Ouro projetado · empate')).toBeTruthy();
  await view.rerender(<GroupChallengeTrophy challenge={{...challenge, status: 'completed'}} />);
  expect(view.getByLabelText('Ouro confirmado · empate')).toBeTruthy();
});

test('keeps the group screen language when showing standings and rules in English', async () => {
  const view = await render(<GroupChallengePanel challenge={challenge} locale="en-US" />, {wrapper});
  expect(view.getByLabelText('Ana, you, rank 1, tied, 700 points')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Rules and rewards'}));
  expect(view.getByText(/Ties are kept: 1st, 1st, 3rd/)).toBeTruthy();
  expect(view.getByText(/70%: \+100 XP/)).toBeTruthy();
  expect(view.getByRole('button', {name: 'Got it'})).toBeTruthy();
});
