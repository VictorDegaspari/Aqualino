import React from 'react';
import {StyleSheet} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as Reanimated from 'react-native-reanimated';
import type {HydrationLog} from '@aqualino/contracts';
import {HydrationHistoryScreen} from '../presentation/HydrationHistoryScreen';
import {HydrationWaterGauge} from '../presentation/HydrationWaterGauge';
import {hydrationService} from '../application/hydrationService';
import {hydrationHomeKey} from '../presentation/useHydrationHome';
import {hydrationLogsKey, mergeHydrationLogs} from '../application/hydrationHistory';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('@react-native-community/netinfo', () => ({useNetInfo: () => ({isConnected: true})}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({
  user: {profile: {timezone: 'America/Sao_Paulo'}},
})}));
jest.mock('../application/hydrationService', () => ({hydrationService: {cachedOrRemote: jest.fn(), logs: jest.fn()}}));

const date = '2026-09-05';
const log: HydrationLog = {
  id: 'log', client_event_id: 'event', local_date: date,
  amount_ml: 1250, occurred_at: '2026-09-05T13:30:00Z', source: 'mobile',
};

beforeEach(() => {
  // Keep the native timers used by React Query while fixing the displayed calendar.
  jest.useFakeTimers({doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'nextTick', 'setImmediate', 'clearImmediate', 'performance']});
  jest.setSystemTime(new Date('2026-09-05T15:00:00Z'));
  jest.mocked(hydrationService.logs).mockReset().mockResolvedValue(mergeHydrationLogs([]));
  // Assert settled levels without relying on a mocked UI animation clock.
  jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setup(beforeRender?: (client: QueryClient) => void) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, gcTime: Infinity}}});
  client.setQueryData(hydrationHomeKey, {data: {
    today: {goal_ml: 2500},
    week: {days: [{date, goal_ml: 2500}, {date: '2026-09-04', goal_ml: 2000}]},
  }});
  jest.mocked(hydrationService.cachedOrRemote).mockImplementation(async () =>
    client.getQueryData<Awaited<ReturnType<typeof hydrationService.cachedOrRemote>>>(hydrationHomeKey)!,
  );
  for (const day of ['2026-09-05', '2026-09-04', '2026-09-03', '2026-09-02', '2026-09-01', '2026-08-31', '2026-08-30']) {
    client.setQueryData([...hydrationLogsKey, undefined, day], mergeHydrationLogs([]));
  }
  client.setQueryData([...hydrationLogsKey, undefined, '2026-09-04'], mergeHydrationLogs([
    {...log, id: 'yesterday', client_event_id: 'yesterday', local_date: '2026-09-04', amount_ml: 1000, occurred_at: '2026-09-05T01:00:00Z'},
  ]));
  beforeRender?.(client);
  const view = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
        <HydrationHistoryScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  return {client, view};
}

test('updates the list, amount and water level for each new marking without reopening history', async () => {
  const {view, client} = await setup();
  expect(view.getByText('0 ml registrados')).toBeTruthy();
  expect(view.queryByTestId('history-water-liquid')).toBeNull();
  expect(view.queryByText('Incline o celular para movimentar a água')).toBeNull();

  await act(() => {client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([log]));});
  await waitFor(() => expect(view.getByText('1.250 ml registrados')).toBeTruthy());
  expect(view.getByText('50% da meta de 2.500 ml.')).toBeTruthy();
  expect(view.getByText('10:30')).toBeTruthy();
  expect(view.queryByText('Pelo app')).toBeNull();
  expect(view.queryByTestId(`history-goal-check-${date}`)).toBeNull();
  expect(view.queryByTestId('strong-mascot-animation')).toBeNull();
  expect(view.getByTestId('history-water-liquid')).toBeTruthy();

  await act(() => {client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([log, {...log, id: 'second', client_event_id: 'second'}]));});
  await waitFor(() => expect(view.getByText('2.500 ml registrados')).toBeTruthy());
  expect(view.getByText('100% da meta de 2.500 ml.')).toBeTruthy();
  expect(view.getByText('Meta atingida!')).toBeTruthy();
  expect(view.getByLabelText('Aqualino forte: meta atingida')).toBeTruthy();
  expect(view.getByTestId('strong-mascot-animation').props.artboardName).toBe('Aqualino Strong - Forca');
  expect(view.getByTestId('strong-mascot-animation').props.stateMachineName).toBe('Aqualino - Strong');
  expect(view.queryByTestId('strong-mascot-fallback')).toBeNull();
  expect(view.getByTestId(`history-goal-check-${date}`)).toBeTruthy();
  expect(view.getByTestId('history-water-vessel')).toBeTruthy();
  expect(view.getByTestId('history-water-liquid')).toBeTruthy();

  await act(() => {client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([
    log, {...log, id: 'second', client_event_id: 'second', invalidated_at: '2026-09-05T14:00:00Z'},
  ]));});
  await waitFor(() => expect(view.getByText('50% da meta de 2.500 ml.')).toBeTruthy());
  expect(view.queryByLabelText('Aqualino forte: meta atingida')).toBeNull();
  expect(view.queryByTestId('strong-mascot-animation')).toBeNull();
  expect(view.queryByTestId(`history-goal-check-${date}`)).toBeNull();
  expect(view.getByTestId('history-water-liquid')).toBeTruthy();
});

test('uses the selected day’s logs, goal and timezone instead of today’s values', async () => {
  const {view, client} = await setup();
  await fireEvent.press(view.getByRole('tab', {name: /04/}));
  expect(view.getByText('SEU NÍVEL NESSE DIA')).toBeTruthy();
  expect(view.getByText('1.000 ml registrados')).toBeTruthy();
  expect(view.getByText('50% da meta de 2.000 ml.')).toBeTruthy();
  expect(view.queryByTestId('strong-mascot-animation')).toBeNull();
  expect(view.getByText('22:00')).toBeTruthy();

  await act(() => client.setQueryData([...hydrationLogsKey, undefined, '2026-09-04'], mergeHydrationLogs([
    {...log, local_date: '2026-09-04', amount_ml: 2000},
  ])));
  await waitFor(() => expect(view.getByText('100% da meta de 2.000 ml.')).toBeTruthy());
  expect(view.getByLabelText('Aqualino forte: meta atingida')).toBeTruthy();
  expect(view.getByTestId('history-goal-check-2026-09-04')).toBeTruthy();
  expect(view.getByTestId('strong-mascot-animation')).toBeTruthy();

  await fireEvent.press(view.getByRole('tab', {name: /05/}));
  expect(view.queryByLabelText('Aqualino forte: meta atingida')).toBeNull();
  expect(view.getByTestId('history-water-vessel')).toBeTruthy();
});

test('hides the mobile source while keeping useful source details', async () => {
  const {view, client} = await setup();
  await act(() => client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([
    log,
    {...log, id: 'widget', client_event_id: 'widget', source: 'widget'},
  ])));

  await waitFor(() => expect(view.getByText('Pelo widget')).toBeTruthy());
  expect(view.queryByText('Pelo app')).toBeNull();
});

test.each([0, 1250, 2475, 2500, 3000])('keeps the water within the glass and celebrates the achieved goal with %i ml', async totalMl => {
  const view = await render(<HydrationWaterGauge totalMl={totalMl} goalMl={2500} />);
  expect(view.getByTestId('history-water-vessel')).toBeTruthy();
  if (totalMl >= 2500) {
    expect(view.getByLabelText('Aqualino forte: meta atingida')).toBeTruthy();
    expect(view.getByTestId('strong-mascot-animation')).toBeTruthy();
  } else {
    expect(view.queryByLabelText('Aqualino forte: meta atingida')).toBeNull();
    expect(view.queryByTestId('strong-mascot-animation')).toBeNull();
  }
  if (totalMl === 0) {
    expect(view.queryByTestId('history-water-liquid')).toBeNull();
  } else {
    const liquid = view.getByTestId('history-water-liquid');
    expect(liquid).toHaveStyle({height: 180 + 164 * Math.min(totalMl / 2500, 1)});
  }
});


test('keeps annulled records in history without adding their water to the gauge', async () => {
  const {view, client} = await setup();
  await act(() => {client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([
    {...log, invalidated_at: '2026-09-05T14:00:00Z'},
  ]));});
  await waitFor(() => expect(view.getByText('Anulada pela maioria do grupo')).toBeTruthy());
  expect(view.getByText('0 ml registrados')).toBeTruthy();
  expect(view.queryByTestId('history-water-liquid')).toBeNull();
});

test('keeps the glass mounted while another day loads, then fills it with that day’s water', async () => {
  const pendingDate = '2026-09-03';
  let resolveLogs!: (page: ReturnType<typeof mergeHydrationLogs>) => void;
  jest.mocked(hydrationService.logs).mockReturnValue(new Promise(resolve => {resolveLogs = resolve;}));
  const {view} = await setup(client => client.removeQueries({queryKey: [...hydrationLogsKey, undefined, pendingDate]}));
  const vessel = view.getByTestId('history-water-vessel');
  await fireEvent.press(view.getByRole('tab', {name: /04/}));
  expect(view.getByTestId('history-water-liquid')).toHaveStyle({height: 262});

  await fireEvent.press(view.getByRole('tab', {name: /03/}));
  expect(view.getByTestId('history-water-vessel')).toBe(vessel);
  expect(view.getByText('Carregando consumo…')).toBeTruthy();
  expect(view.queryByTestId('history-water-liquid')).toBeNull();
  expect(view.queryByText('0 ml registrados')).toBeNull();
  expect(view.getByText('Calculando os últimos 7 dias…')).toBeTruthy();

  await act(() => resolveLogs(mergeHydrationLogs([{...log, local_date: pendingDate, amount_ml: 2000}])));
  await waitFor(() => expect(view.getByText('2.000 ml registrados')).toBeTruthy());
  expect(view.getByTestId('history-water-vessel')).toBe(vessel);
  expect(StyleSheet.flatten(view.getByTestId('history-water-liquid').props.style).height).toBeCloseTo(311.2);
  expect(view.getByText('429 ml / dia')).toBeTruthy();
});

test('averages all seven displayed days across the month boundary, including zeros and excluding annulled water', async () => {
  const {view, client} = await setup(cache => {
    cache.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([
      {...log, amount_ml: 2500},
      {...log, id: 'annulled', client_event_id: 'annulled', amount_ml: 7500, invalidated_at: '2026-09-05T14:00:00Z'},
    ]));
    cache.setQueryData([...hydrationLogsKey, undefined, '2026-08-30'], mergeHydrationLogs([
      {...log, local_date: '2026-08-30', amount_ml: 3500},
    ]));
  });
  expect(view.getByText('1.000 ml / dia')).toBeTruthy();
  expect(view.getByText('7.000 ml nos últimos 7 dias, incluindo hoje')).toBeTruthy();
  await fireEvent.press(view.getByRole('tab', {name: /30/}));
  expect(view.getByText('1.000 ml / dia')).toBeTruthy();

  await act(() => client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([{...log, amount_ml: 500}])));
  await waitFor(() => expect(view.getByText('714 ml / dia')).toBeTruthy());
});

test('does not present a partial week as a complete average when a day fails to load and allows retrying', async () => {
  jest.mocked(hydrationService.logs).mockRejectedValueOnce(new Error('Offline'));
  const {view} = await setup(client => client.removeQueries({queryKey: [...hydrationLogsKey, undefined, '2026-09-03']}));
  await waitFor(() => expect(view.getByText('Não foi possível carregar a média.')).toBeTruthy());
  expect(view.getByTestId('history-water-vessel')).toBeTruthy();
  expect(view.getByText('0 ml registrados')).toBeTruthy();
  expect(view.queryByText(/ml \/ dia/)).toBeNull();

  await fireEvent.press(view.getByRole('button', {name: 'Recarregar média semanal'}));
  await waitFor(() => expect(view.getByText('0 ml / dia')).toBeTruthy());
});

test('fills from the bottom again when selecting a cached day with the same water percentage', async () => {
  jest.mocked(Reanimated.useReducedMotion).mockReturnValue(false);
  const animate = jest.spyOn(Reanimated, 'withTiming');
  const {view} = await setup(client => client.setQueryData([...hydrationLogsKey, undefined, date], mergeHydrationLogs([log])));
  const vessel = view.getByTestId('history-water-vessel');
  const water = view.getByTestId('history-water-liquid');
  expect(water).toHaveStyle({height: 180});
  expect(animate).toHaveBeenCalledWith(50, expect.objectContaining({duration: 850}));
  animate.mockClear();

  await fireEvent.press(view.getByRole('tab', {name: /04/}));
  expect(view.getByTestId('history-water-vessel')).toBe(vessel);
  expect(view.getByTestId('history-water-liquid')).not.toBe(water);
  expect(view.getByTestId('history-water-liquid')).toHaveStyle({height: 180});
  expect(animate).toHaveBeenCalledWith(50, expect.objectContaining({duration: 850}));
});
