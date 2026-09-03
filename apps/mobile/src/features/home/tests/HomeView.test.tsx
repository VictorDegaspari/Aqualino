import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
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
    schema_version: 1, generated_at: '2026-09-02T12:00:00Z', user_timezone: 'America/Sao_Paulo',
    last_log_at: null, days_since_last_log: null, last_log_semantic_key: 'no_history', today_total_ml: 0,
    daily_goal_ml: 2000, condition: 'empty', decoration: null, animation: 'welcoming',
    static_asset: 'aqualino_empty',
  },
};

const props = {
  data, loading: false, offline: false, syncing: false, pending: 0, volumes: [200, 300],
  displayName: 'Ana', streak: 2, level: 1, onHydrate: jest.fn(), onRetry: jest.fn(),
  onOpenInventory: jest.fn(), onSignOut: jest.fn(),
};

test('renders loading state', async () => {
  expect((await render(<HomeView {...props} data={undefined} loading />)).getByLabelText('Carregando hidratação')).toBeTruthy();
});

test('renders error state with retry', async () => {
  const view = await render(<HomeView {...props} data={undefined} error="Sem conexão" />);
  await fireEvent.press(view.getByRole('button', {name: 'Tentar novamente'}));
  expect(props.onRetry).toHaveBeenCalled();
});

test('renders friendly empty and accessible quick volumes', async () => {
  const view = await render(<HomeView {...props} />);
  expect(view.getByText('Sua primeira gota de hoje está a um toque.')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Registrar 300 mililitros'));
  expect(props.onHydrate).toHaveBeenCalledWith(300);
});

test('renders offline pending state', async () => {
  const view = await render(<HomeView {...props} offline pending={2} />);
  expect(view.getByText('2 registro(s) aguardando sincronização')).toBeTruthy();
});

test('renders successful progress and mascot state', async () => {
  const hydrated: HydrationHomeData = {
    today: {...data.today, total_ml: 1000, percentage: 50, log_count: 3},
    week: data.week,
    mascot: {...data.mascot, condition: 'happy', static_asset: 'aqualino_happy'},
  };
  const view = await render(<HomeView {...props} data={hydrated} />);
  expect(view.getByText('1000 ml')).toBeTruthy();
  expect(view.getByLabelText('Aqualino está feliz')).toBeTruthy();
  expect(view.getByText('Seu caminho de 7 dias')).toBeTruthy();
  expect(view.getByLabelText('1 de 7 metas atingidas')).toBeTruthy();
  expect(view.getByLabelText(/TER, 01\/09: Meta perdida.*Protegido por congelamento/)).toBeTruthy();
  expect(view.getByLabelText(/DOM, 06\/09: Futuro/)).toBeTruthy();
});

test('opens the inventory from the Home header', async () => {
  const onOpenInventory = jest.fn();
  const view = await render(<HomeView {...props} onOpenInventory={onOpenInventory} />);

  await fireEvent.press(view.getByRole('button', {name: 'Inventário'}));
  expect(onOpenInventory).toHaveBeenCalledTimes(1);
});
