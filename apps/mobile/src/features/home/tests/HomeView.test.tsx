import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {HomeView} from '../presentation/HomeView';
import {AppModalProvider} from '../../../shared/components/AppModal';

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
  data: activeData(data), loading: false, offline: false, syncing: false, pending: 0,
  displayName: 'Ana', streak: 2, xp: 320, level: 10, onRetry: jest.fn(), onOpenHydration: jest.fn(),
  onOpenInventory: jest.fn(),
};

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

function renderHome(view: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={safeAreaMetrics}><AppModalProvider>{view}</AppModalProvider></SafeAreaProvider>);
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
  expect(view.getByLabelText('Nível 10')).toBeTruthy();
  expect(view.getByText('Sua primeira gota de hoje está a um toque.')).toBeTruthy();
  expect(view.getByLabelText('Fogo apagado: você ainda não bebeu água hoje')).toBeTruthy();
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

test('offers the group start only when a real group is available', async () => {
  const onStartChallenge = jest.fn();
  const groupHome = activeData(data);
  groupHome.challenges!.group_name = 'Amigos';
  groupHome.challenges!.can_start_group = true;
  const view = await renderHome(<HomeView {...props} data={groupHome} onStartChallenge={onStartChallenge} />);

  expect(view.getByRole('tab', {name: 'Grupo'}).props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(view.getByRole('tab', {name: 'Grupo'}));

  await fireEvent.press(view.getByRole('button', {name: 'Iniciar desafio do grupo'}));
  expect(onStartChallenge).toHaveBeenCalledWith('group');
  expect(view.queryByText('Placar do grupo')).toBeNull();
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
  const view = await renderHome(<HomeView {...props} data={activeData(hydrated)} />);
  expect(view.getByText('1.000 ml')).toBeTruthy();
  expect(view.getByLabelText('Fogo aceso: você já bebeu água hoje')).toBeTruthy();
  expect(view.getByLabelText('Aqualino está feliz')).toBeTruthy();
  expect(view.queryByText('Desafio atual')).toBeNull();
  expect(view.getByRole('tab', {name: 'Grupo'})).toBeTruthy();
  expect(view.getByLabelText(/TER, 01\/09: Meta perdida.*Protegido por congelamento/)).toBeTruthy();
  expect(view.getByLabelText(/DOM, 06\/09: Futuro/)).toBeTruthy();
});

test('removes animated home decorations while its tab is inactive', async () => {
  const view = await renderHome(<HomeView {...props} motionEnabled={false} />);

  expect(view.queryByTestId('challenge-scene-decoration')).toBeNull();
  expect(view.queryAllByTestId('challenge-bubble')).toHaveLength(0);
  expect(view.getByTestId('current-water-drop')).toBeTruthy();
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

test('fills only the current day drop using that day\'s consumed amount and goal', async () => {
  const hydrated: HydrationHomeData = {
    ...data,
    today: {...data.today, total_ml: 1500, goal_ml: 3000, percentage: 50},
    week: {
      ...data.week,
      days: data.week.days.map(day => day.is_today
        ? {...day, total_ml: 1500, goal_ml: 3000, percentage: 50, state: 'in_progress'}
        : day),
    },
  };
  const view = await renderHome(<HomeView {...props} data={activeData(hydrated)} />);

  expect(view.getAllByTestId('current-water-drop')).toHaveLength(1);
  expect(Number(view.getByTestId('current-water-drop-liquid').props.height)).toBe(63.5);
});

test('shows the current day drop on Sunday and empties it for the new day', async () => {
  const sunday: HydrationHomeData = {
    ...data,
    today: {...data.today, local_date: '2026-09-06', total_ml: 2000, percentage: 100, goal_achieved: true},
    week: {
      ...data.week,
      current_date: '2026-09-06',
      days: data.week.days.map(day => day.is_trophy
        ? {...day, is_today: true, total_ml: 2000, percentage: 100, state: 'goal_achieved'}
        : {...day, is_today: false}),
    },
  };
  const view = await renderHome(<HomeView {...props} data={activeData(sunday)} />);

  expect(view.getAllByTestId('current-water-drop')).toHaveLength(1);
  expect(Number(view.getByTestId('current-water-drop-liquid').props.height)).toBe(127);
  expect(view.queryByText('Prata projetada')).toBeNull();

  const nextWeek: HydrationHomeData = {
    ...data,
    today: {...data.today, local_date: '2026-09-07'},
    week: {
      ...data.week,
      starts_on: '2026-09-07', ends_on: '2026-09-13', current_date: '2026-09-07',
      completed_goal_days: 0, total_ml: 0,
      days: data.week.days.map((day, index) => ({
        ...day, date: `2026-09-${String(index + 7).padStart(2, '0')}`, is_today: index === 0,
        total_ml: 0, percentage: 0, state: index === 0 ? 'no_record' : 'future', protection: null,
      })),
    },
  };
  await view.rerender(<SafeAreaProvider initialMetrics={safeAreaMetrics}><HomeView {...props} data={activeData(nextWeek)} /></SafeAreaProvider>);

  expect(view.getAllByTestId('current-water-drop')).toHaveLength(1);
  expect(view.queryByTestId('current-water-drop-liquid')).toBeNull();
  expect(view.getByLabelText(/SEG, 07\/09: Sem registro/)).toBeTruthy();
});

test('hides the path until the person explicitly starts the solo challenge', async () => {
  const onStartChallenge = jest.fn();
  const view = await renderHome(<HomeView {...props} data={data} onStartChallenge={onStartChallenge} />);
  expect(view.queryByLabelText(/QUA, 02\/09:/)).toBeNull();
  expect(view.queryByRole('button', {name: 'Ver baú do desafio solo'})).toBeNull();
  expect(view.getByTestId('current-water-drop')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Iniciar desafio de 7 dias'}));
  expect(onStartChallenge).toHaveBeenCalledWith('solo');
});

test('uses real weekdays for a challenge started on Wednesday and ends in a chest', async () => {
  const home = activeData(data);
  home.challenges!.solo!.progress = {...data.week, starts_on: '2026-09-02', ends_on: '2026-09-08', days: data.week.days.map((day, index) => ({
    ...day, date: `2026-09-${String(index + 2).padStart(2, '0')}`, weekday: ((index + 2) % 7 + 1) as typeof day.weekday, is_today: index === 0,
  }))};
  const view = await renderHome(<HomeView {...props} data={home} />);
  expect(view.getByLabelText(/QUA, 02\/09:/)).toBeTruthy();
  expect(view.getByLabelText(/TER, 08\/09:/)).toBeTruthy();
  expect(view.getByRole('button', {name: 'Ver baú do desafio solo'})).toBeTruthy();
  expect(view.queryByText('Prata projetada')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Ver baú do desafio solo'}));
  expect(view.getByRole('header', {name: 'Baú do desafio solo'})).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Abrir baú'})).toBeNull();
});

test('shows the scheduled group start instead of allowing today to advance its path', async () => {
  const home = activeData(data);
  home.challenges!.group_name = 'Amigos';
  home.challenges!.group = {...home.challenges!.solo!, id: 'group', mode: 'group', status: 'scheduled', reward: null};
  const view = await renderHome(<HomeView {...props} data={home} />);
  await fireEvent.press(view.getByRole('tab', {name: 'Grupo'}));
  expect(view.getByText('Desafio agendado!')).toBeTruthy();
  expect(view.queryByLabelText(/QUA, 02\/09:/)).toBeNull();
  expect(view.queryByRole('button', {name: 'Iniciar desafio do grupo'})).toBeNull();
  expect(view.queryByRole('button', {name: 'Ver baú do desafio solo'})).toBeNull();
});

test('opens the chest once and displays the confirmed item without offering another draw', async () => {
  let finish!: () => void;
  const claim = jest.fn(() => new Promise<void>(resolve => {finish = resolve;}));
  const initial = activeData(data);
  initial.challenges!.solo!.reward = {state: 'available', type: null, amount: null};
  function RewardHome() {
    const [home, setHome] = React.useState(initial);
    return <HomeView {...props} data={home} onClaimReward={async id => {
      await claim();
      expect(id).toBe('solo');
      setHome({...home, challenges: {...home.challenges!, solo: {...home.challenges!.solo!, reward: {state: 'claimed', type: 'streak_freeze', amount: 1}}}});
    }} />;
  }
  const view = await renderHome(<RewardHome />);
  await fireEvent.press(view.getByRole('button', {name: 'Ver baú do desafio solo'}));
  await fireEvent.press(view.getByRole('button', {name: 'Abrir baú'}));
  await fireEvent.press(view.getByRole('button', {name: 'Abrir baú'}));
  expect(claim).toHaveBeenCalledTimes(1);
  await act(() => finish());
  await waitFor(() => expect(view.getByText(/Você ganhou uma poção de congelamento/)).toBeTruthy());
  expect(view.queryByRole('button', {name: 'Abrir baú'})).toBeNull();
});

function activeData(home: HydrationHomeData): HydrationHomeData {
  return {...home, challenges: {
    solo: {id: 'solo', mode: 'solo', status: 'active', starts_at: '2026-08-31T12:00:00Z', ends_at: '2026-09-07T03:00:00Z', progress: home.week, reward: {state: 'locked', type: null, amount: null}},
    group: null, group_name: null, can_start_group: false,
  }};
}
