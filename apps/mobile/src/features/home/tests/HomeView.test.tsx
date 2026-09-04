import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {HomeView} from '../presentation/HomeView';

const data: HydrationHomeData = {
  today: {
    local_date: '2026-09-02', timezone: 'America/Sao_Paulo', total_ml: 0, goal_ml: 2000,
    percentage: 0, goal_achieved: false, log_count: 0,
  },
  week: {
    mode: 'civil_week', starts_on: '2026-08-31', ends_on: '2026-09-06',
    current_date: '2026-09-02', timezone: 'America/Sao_Paulo', completed_goal_days: 1, total_ml: 2300,
    days: [
      {date: '2026-08-31', weekday: 1, state: 'goal_achieved', total_ml: 2000, goal_ml: 2000, percentage: 100, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-01', weekday: 2, state: 'missed', total_ml: 300, goal_ml: 2000, percentage: 15, is_today: false, is_trophy: false, protection: 'streak_freeze'},
      {date: '2026-09-02', weekday: 3, state: 'no_record', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: true, is_trophy: false, protection: null},
      {date: '2026-09-03', weekday: 4, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-04', weekday: 5, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-05', weekday: 6, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-06', weekday: 7, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: true, protection: null},
    ],
  },
  mascot: {
    schema_version: 2, generated_at: '2026-09-02T12:00:00Z', user_timezone: 'America/Sao_Paulo',
    last_log_at: null, days_since_last_log: null, last_log_semantic_key: 'no_history', today_total_ml: 0,
    current_streak: 0, daily_goal_ml: 2000, condition: 'empty', decoration: null, animation: 'welcoming',
    static_asset: 'aqualino_empty',
  },
};

const props = {
  data, loading: false, offline: false, syncing: false, pending: 0,
  displayName: 'Ana', streak: 2, xp: 320, onRetry: jest.fn(), onOpenHydration: jest.fn(),
  onOpenInventory: jest.fn(),
};

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

function renderHome(view: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={safeAreaMetrics}>{view}</SafeAreaProvider>);
}

test('renders loading state', async () => {
  expect((await renderHome(<HomeView {...props} data={undefined} loading />)).getByLabelText('Carregando hidratação')).toBeTruthy();
});

test('renders error state with retry', async () => {
  const view = await renderHome(<HomeView {...props} data={undefined} error="Sem conexão" />);
  await fireEvent.press(view.getByRole('button', {name: 'Tentar novamente'}));
  expect(props.onRetry).toHaveBeenCalled();
});

test('renders friendly empty state and opens the hydration picker', async () => {
  const view = await renderHome(<HomeView {...props} />);
  expect(view.getByText('Sua primeira gota de hoje está a um toque.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Bebi água'}));
  expect(props.onOpenHydration).toHaveBeenCalledTimes(1);
});

test('keeps group mode locked when the person has no active group', async () => {
  const view = await renderHome(<HomeView {...props} />);

  expect(view.getByRole('tab', {name: 'Solo'}).props.accessibilityState.selected).toBe(true);
  expect(view.getByRole('tab', {name: 'Grupo'}).props.accessibilityState.disabled).toBe(true);
  expect(view.queryByText('Placar do grupo')).toBeNull();

  await fireEvent.press(view.getByRole('tab', {name: 'Grupo'}));

  expect(view.getByRole('tab', {name: 'Solo'}).props.accessibilityState.selected).toBe(true);
  expect(view.queryByText('Placar do grupo')).toBeNull();
});

test('shows the group leaderboard when an active group is available', async () => {
  const view = await renderHome(<HomeView {...props} hasActiveGroup />);

  expect(view.getByRole('tab', {name: 'Grupo'}).props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(view.getByRole('tab', {name: 'Grupo'}));

  expect(view.getByText('Placar do grupo')).toBeTruthy();
});

test('renders offline pending state', async () => {
  const view = await renderHome(<HomeView {...props} offline pending={2} />);
  expect(view.getByText('2 registro(s) aguardando sincronização')).toBeTruthy();
});

test('renders successful progress and mascot state', async () => {
  const hydrated: HydrationHomeData = {
    today: {...data.today, total_ml: 1000, percentage: 50, log_count: 3},
    week: data.week,
    mascot: {...data.mascot, condition: 'happy', static_asset: 'aqualino_happy'},
  };
  const view = await renderHome(<HomeView {...props} data={hydrated} />);
  expect(view.getByText('1.000 ml')).toBeTruthy();
  expect(view.getByLabelText('Aqualino está feliz')).toBeTruthy();
  expect(view.queryByText('Desafio atual')).toBeNull();
  expect(view.getByRole('tab', {name: 'Grupo'})).toBeTruthy();
  expect(view.getByLabelText(/TER, 01\/09: Meta perdida.*Protegido por congelamento/)).toBeTruthy();
  expect(view.getByLabelText(/DOM, 06\/09: Futuro/)).toBeTruthy();
});

test('opens the inventory from the XP status', async () => {
  const onOpenInventory = jest.fn();
  const view = await renderHome(<HomeView {...props} onOpenInventory={onOpenInventory} />);

  await fireEvent.press(view.getByRole('button', {name: 'Abrir inventário, 320 XP'}));
  expect(onOpenInventory).toHaveBeenCalledTimes(1);
});

test('opens hydration details when a challenge day is pressed', async () => {
  const view = await renderHome(<HomeView {...props} />);

  await fireEvent.press(view.getByLabelText(/TER, 01\/09: Meta perdida/));

  expect(view.getByText('TER • 01 SET')).toBeTruthy();
  expect(view.getByText('Meta não atingida')).toBeTruthy();
  expect(view.getByText('Faltaram 1.700 ml')).toBeTruthy();
});
