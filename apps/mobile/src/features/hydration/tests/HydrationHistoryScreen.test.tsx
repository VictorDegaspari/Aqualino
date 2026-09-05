import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationLog} from '@aqualino/contracts';
import {HydrationHistoryScreen} from '../presentation/HydrationHistoryScreen';
import {HydrationWaterGauge} from '../presentation/HydrationWaterGauge';
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
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, gcTime: Infinity}}});
  client.setQueryData(hydrationHomeKey, {data: {
    today: {goal_ml: 2500},
    week: {days: [{date, goal_ml: 2500}, {date: '2026-09-04', goal_ml: 2000}]},
  }});
  client.setQueryData([...hydrationLogsKey, date], mergeHydrationLogs([]));
  client.setQueryData([...hydrationLogsKey, '2026-09-04'], mergeHydrationLogs([
    {...log, id: 'yesterday', client_event_id: 'yesterday', local_date: '2026-09-04', amount_ml: 1000, occurred_at: '2026-09-05T01:00:00Z'},
  ]));
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

  await act(() => {client.setQueryData([...hydrationLogsKey, date], mergeHydrationLogs([log]));});
  await waitFor(() => expect(view.getByText('1.250 ml registrados')).toBeTruthy());
  expect(view.getByText('50% da meta de 2.500 ml.')).toBeTruthy();
  expect(view.getByText('10:30')).toBeTruthy();
  expect(view.getByTestId('history-water-liquid')).toBeTruthy();

  await act(() => {client.setQueryData([...hydrationLogsKey, date], mergeHydrationLogs([log, {...log, id: 'second', client_event_id: 'second'}]));});
  await waitFor(() => expect(view.getByText('2.500 ml registrados')).toBeTruthy());
  expect(view.getByText('100% da meta de 2.500 ml.')).toBeTruthy();
  expect(view.getByText('Meta atingida!')).toBeTruthy();
});

test('uses the selected day’s logs, goal and timezone instead of today’s values', async () => {
  const {view} = await setup();
  await fireEvent.press(view.getByRole('tab', {name: /04/}));
  expect(view.getByText('SEU NÍVEL NESSE DIA')).toBeTruthy();
  expect(view.getByText('1.000 ml registrados')).toBeTruthy();
  expect(view.getByText('50% da meta de 2.000 ml.')).toBeTruthy();
  expect(view.getByText('22:00')).toBeTruthy();
});

test.each([0, 1250, 2500, 3000])('keeps the water within the glass with %i ml and a 2500 ml goal', async totalMl => {
  const view = await render(<HydrationWaterGauge totalMl={totalMl} goalMl={2500} />);
  if (totalMl === 0) {
    expect(view.queryByTestId('history-water-liquid')).toBeNull();
  } else {
    const liquid = view.getByTestId('history-water-liquid');
    expect(liquid).toHaveStyle({height: 180 + 200 * Math.min(totalMl / 2500, 1)});
  }
});
