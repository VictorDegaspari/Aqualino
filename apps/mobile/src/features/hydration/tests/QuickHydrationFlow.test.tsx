import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {launchCamera} from 'react-native-image-picker';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import type {RecordOutcome} from '../application/offlineHydrationService';
import type {HydrationLogPage} from '@aqualino/contracts';
import {hydrationLogsKey, mergeHydrationLogs} from '../application/hydrationHistory';
import {hydrationService} from '../application/hydrationService';
import {hydrationHomeKey} from '../presentation/useHydrationHome';
import {QuickHydrationScreen} from '../presentation/QuickHydrationScreen';

const mockPreferences = {lastAmountMl: 300, selectAmount: jest.fn()};
const mockApplyGamification = jest.fn();
jest.mock('../application/hydrationService', () => ({hydrationService: {record: jest.fn(), pendingCount: jest.fn()}}));
jest.mock('@react-native-community/netinfo', () => ({useNetInfo: () => ({isConnected: true})}));
jest.mock('react-native-image-picker', () => ({launchCamera: jest.fn()}));
jest.mock('../../auth/application/sessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({user: {id: 'ana', profile: {favorite_volumes_ml: [200, 300, 500]}}, applyGamification: mockApplyGamification}),
}));
jest.mock('../application/hydrationPreferencesStore', () => ({
  useHydrationPreferencesStore: (selector: (state: typeof mockPreferences) => unknown) => selector(mockPreferences),
}));

const data: HydrationHomeData = {
  today: {local_date: '2026-09-02', timezone: 'America/Sao_Paulo', total_ml: 0, goal_ml: 2000, percentage: 0, goal_achieved: false, log_count: 0},
  week: {
    mode: 'civil_week', starts_on: '2026-08-31', ends_on: '2026-09-06', current_date: '2026-09-02',
    timezone: 'America/Sao_Paulo', completed_goal_days: 0, total_ml: 0,
    days: [{date: '2026-09-02', weekday: 3, state: 'no_record', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: true, is_trophy: false, protection: null}],
  },
  mascot: {
    schema_version: 2, generated_at: '2026-09-02T12:00:00Z', user_timezone: 'America/Sao_Paulo', last_log_at: null,
    days_since_last_log: null, last_log_semantic_key: 'no_history', current_streak: 0, today_total_ml: 0,
    daily_goal_ml: 2000, condition: 'empty', decoration: null, animation: 'welcoming', static_asset: 'aqualino_empty',
  },
};
const saved: RecordOutcome = {
  kind: 'synced',
  result: {
    log: {id: 'log', amount_ml: 300, occurred_at: '2026-09-02T12:00:00Z', local_date: '2026-09-02', source: 'mobile', client_event_id: 'event'},
    idempotent_replay: false,
    today: {...data.today, total_ml: 300, percentage: 15, log_count: 1},
    gamification: {xp_awarded: 10, xp_total: 10, level: 1, streak: 1, new_achievements: []},
    mascot: {condition: 'happy', decoration: null, animation: 'idle_happy', static_asset: 'aqualino_happy'},
    widget: {...data.mascot, today_total_ml: 300, condition: 'happy'},
  },
};
const queued: RecordOutcome = {
  kind: 'queued', event: {clientEventId: 'event', amountMl: 300, occurredAt: '2026-09-02T12:00:00Z', source: 'mobile', attempts: 0},
};
const service = jest.mocked(hydrationService);

async function setup(photoUri?: string, source = 'mobile') {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity}, mutations: {retry: false, gcTime: Infinity}}});
  client.setQueryData(hydrationHomeKey, {data, offline: false});
  const navigation = {popTo: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true), goBack: jest.fn()};
  const props = {navigation, route: {key: 'quick', name: 'QuickHydration', params: {source, photoUri}}} as unknown as NativeStackScreenProps<RootStackParamList, 'QuickHydration'>;
  const view = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 44, right: 0, bottom: 34, left: 0}}}>
        <QuickHydrationScreen {...props} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  return {view, client, navigation};
}

beforeEach(() => {
  jest.clearAllMocks();
  service.record.mockResolvedValue(saved);
  service.pendingCount.mockResolvedValue(0);
});

test('requires a photo before recording even when opened by a shortcut', async () => {
  const {view} = await setup(undefined, 'shortcut');
  const volume = view.getByRole('button', {name: 'Registrar 300 ml de água'});
  expect(volume).toBeDisabled();
  await fireEvent.press(volume);
  expect(service.record).not.toHaveBeenCalled();

  jest.mocked(launchCamera).mockResolvedValue({assets: [{uri: 'file:///cup.jpg'}]});
  await fireEvent.press(view.getByRole('button', {name: 'Tirar foto do copo'}));
  expect(view.getByLabelText('Foto do seu copo ou garrafa')).toBeTruthy();
  expect(view.getByRole('button', {name: 'Registrar 300 ml de água'})).toBeEnabled();
});

test.each([{didCancel: true}, {errorCode: 'permission' as const}])('keeps recording locked when the camera returns %s', async response => {
  const {view} = await setup();
  jest.mocked(launchCamera).mockResolvedValue(response);
  await fireEvent.press(view.getByRole('button', {name: 'Tirar foto do copo'}));
  expect(view.getByRole('button', {name: 'Registrar 300 ml de água'})).toBeDisabled();
  expect(service.record).not.toHaveBeenCalled();
});

test('updates the Home drop before returning and prevents repeated taps during saving', async () => {
  let finish!: (outcome: RecordOutcome) => void;
  service.record.mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  const {view, client, navigation} = await setup('file:///cup.jpg');
  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(service.record).toHaveBeenCalledTimes(1));
  expect(view.getByText('Registrando 300 ml…')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Registrar 500 ml de água'}));
  expect(service.record).toHaveBeenCalledTimes(1);
  expect(navigation.popTo).not.toHaveBeenCalled();

  navigation.popTo.mockImplementation(() => {
    expect(mockApplyGamification).toHaveBeenCalledWith('ana', saved.result.gamification);
    const home = client.getQueryData<{data: HydrationHomeData}>(hydrationHomeKey)!;
    expect(home.data.today.total_ml).toBe(300);
    expect(home.data.week.days[0]).toMatchObject({total_ml: 300, percentage: 15, state: 'in_progress'});
    expect(client.getQueryData<HydrationLogPage>([...hydrationLogsKey, '2026-09-02'])?.data).toEqual([saved.result.log]);
  });
  await act(() => finish(saved));
  await waitFor(() => expect(navigation.popTo).toHaveBeenCalledWith('Home', {recordedAmountMl: 300}));
  expect(launchCamera).not.toHaveBeenCalled();
});

test('returns with the updated drop when the drink is saved offline', async () => {
  service.record.mockResolvedValue(queued);
  service.pendingCount.mockResolvedValue(1);
  const {view, client, navigation} = await setup('file:///cup.jpg');
  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(navigation.popTo).toHaveBeenCalledWith('Home', {recordedAmountMl: 300}));
  const home = client.getQueryData<{data: HydrationHomeData; offline: boolean}>(hydrationHomeKey)!;
  expect(home.offline).toBe(true);
  expect(mockApplyGamification).not.toHaveBeenCalled();
  expect(home.data.week.days[0]).toMatchObject({total_ml: 300, percentage: 15});
  expect(client.getQueryData<HydrationLogPage>([...hydrationLogsKey, '2026-09-02'])?.data).toEqual([
    expect.objectContaining({amount_ml: 300, client_event_id: 'event', local_date: '2026-09-02'}),
  ]);
});

test('keeps the photo and allows retry if saving fails', async () => {
  service.record.mockRejectedValueOnce(new Error('Não foi possível salvar.'));
  const {view, client, navigation} = await setup('file:///cup.jpg');
  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Não foi possível salvar.'));
  expect(navigation.popTo).not.toHaveBeenCalled();
  expect(client.getQueryData(hydrationHomeKey)).toEqual({data, offline: false});
  expect(client.getQueryData([...hydrationLogsKey, '2026-09-02'])).toBeUndefined();
  expect(view.getByLabelText('Foto do seu copo ou garrafa')).toBeTruthy();

  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(navigation.popTo).toHaveBeenCalledTimes(1));
});

test('does not offer a duplicate drink when only refreshing the queue counter fails', async () => {
  service.pendingCount.mockRejectedValueOnce(new Error('Contador indisponível'));
  const {view, navigation} = await setup('file:///cup.jpg');
  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(navigation.popTo).toHaveBeenCalledTimes(1));
  expect(view.queryByRole('alert')).toBeNull();
  expect(service.record).toHaveBeenCalledTimes(1);
});

test('reconciles a replay with existing history without counting the drink twice', async () => {
  const {view, client, navigation} = await setup('file:///cup.jpg');
  const queryKey = [...hydrationLogsKey, '2026-09-02'];
  const earlier = {...saved.result.log, id: 'earlier', client_event_id: 'earlier', amount_ml: 200, occurred_at: '2026-09-02T11:00:00Z'};
  client.setQueryData(queryKey, mergeHydrationLogs([earlier, {...saved.result.log, id: 'event'}]));
  service.record.mockResolvedValue({...saved, result: {...saved.result, idempotent_replay: true}});

  await fireEvent.press(view.getByRole('button', {name: 'Registrar 300 ml de água'}));
  await waitFor(() => expect(navigation.popTo).toHaveBeenCalledTimes(1));
  expect(client.getQueryData<HydrationLogPage>(queryKey)?.data.map(log => log.amount_ml)).toEqual([300, 200]);
  expect(client.getQueryData<HydrationLogPage>(queryKey)?.data[0].id).toBe('log');
  expect(client.getQueryData<HydrationLogPage>(queryKey)?.meta.total).toBe(2);
});
