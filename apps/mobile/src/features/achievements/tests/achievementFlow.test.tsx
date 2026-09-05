import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {createMMKV} from 'react-native-mmkv';
import {emptyAchievementCollection} from '../application/achievementCatalog';
import {readAchievementSnapshot, saveAchievementSnapshot, useAchievementLocalStore} from '../application/achievementLocalStore';
import {achievementKey, synchronizeAchievements} from '../application/achievementSync';
import {achievementRepository} from '../data/achievementRepository';
import {AchievementProvider} from '../presentation/AchievementProvider';
import {useAchievements} from '../presentation/useAchievements';
import {useReminderStore} from '../../reminders/application/reminderStore';
import {scheduleReminder} from '../../reminders/application/reminderNotificationService';
import {AppModalProvider} from '../../../shared/components/AppModal';

let mockUserId: string | null = 'ana';
jest.mock('../../auth/application/sessionStore', () => {
  const state = () => ({status: mockUserId ? 'signedIn' : 'signedOut', user: mockUserId ? {id: mockUserId, profile: {onboarding_completed_at: '2026-09-01'}} : null});
  return {useSessionStore: Object.assign((selector: (value: unknown) => unknown) => selector(state()), {getState: state})};
});
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({useOnboardingPreferencesStore: (selector: (value: unknown) => unknown) => selector({locale: 'pt-BR'})}));
jest.mock('react-native-mmkv', () => {
  const values = new Map();
  return {createMMKV: () => ({getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), clearAll: () => values.clear()})};
});
jest.mock('@react-native-community/netinfo', () => ({addEventListener: jest.fn(() => jest.fn())}));
jest.mock('../data/achievementRepository', () => ({achievementRepository: {collection: jest.fn(), reminderCreated: jest.fn(), acknowledge: jest.fn()}}));
jest.mock('../../reminders/application/reminderNotificationService', () => ({scheduleReminder: jest.fn(), cancelReminder: jest.fn()}));

const repository = jest.mocked(achievementRepository);
const earned = {...emptyAchievementCollection, unlocked_count: 1, items: emptyAchievementCollection.items.map(item => item.code === 'first_reminder' ? {...item, unlocked_at: '2026-09-04T12:00:00Z', progress: 1} : item)};
const clients: QueryClient[] = [];
const storage = createMMKV();
function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity, staleTime: Infinity}}});
  clients.push(client);
  const wrapper = ({children}: React.PropsWithChildren) => <QueryClientProvider client={client}><SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 0, bottom: 0, left: 0, right: 0}}}><AppModalProvider>{children}</AppModalProvider></SafeAreaProvider></QueryClientProvider>;
  return {client, wrapper};
}
beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'ana';
  storage.clearAll();
  useAchievementLocalStore.setState({pendingReminders: {}, pendingAcknowledgements: {}, seen: {}, detailOpen: false});
  useReminderStore.setState({reminders: []});
  repository.collection.mockResolvedValue(emptyAchievementCollection);
  repository.reminderCreated.mockResolvedValue(earned);
  repository.acknowledge.mockResolvedValue({code: 'first_reminder', celebrated_at: '2026-09-04T13:00:00Z'});
  jest.mocked(scheduleReminder).mockResolvedValue();
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({remove: jest.fn()});
});
afterEach(() => {clients.splice(0).forEach(client => client.clear()); jest.useRealTimers();});

test('grants the first reminder only after native scheduling succeeds and retains it after deletion', async () => {
  jest.mocked(scheduleReminder).mockRejectedValueOnce(new Error('Permission denied'));
  await expect(useReminderStore.getState().addReminder(8, 0, [1])).rejects.toThrow('Permission denied');
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBeUndefined();
  await useReminderStore.getState().addReminder(8, 0, [1]);
  const date = useAchievementLocalStore.getState().pendingReminders.ana;
  expect(date).toBeTruthy();
  await useReminderStore.getState().addReminder(9, 0, [2]);
  await useReminderStore.getState().removeReminder(useReminderStore.getState().reminders[0].id);
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBe(date);
});

test('keeps a delayed native reminder associated with the account that created it', async () => {
  let finish!: () => void;
  jest.mocked(scheduleReminder).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  const operation = useReminderStore.getState().addReminder(8, 0, [1]);
  mockUserId = 'bruno';
  finish();
  await operation;
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBeTruthy();
  expect(useAchievementLocalStore.getState().pendingReminders.bruno).toBeUndefined();
});

test('shows the offline reminder immediately and keeps cached collections isolated by account', async () => {
  saveAchievementSnapshot('ana', emptyAchievementCollection);
  useAchievementLocalStore.getState().markReminder('ana');
  repository.collection.mockRejectedValue(new Error('Offline'));
  const {wrapper} = setup();
  const hook = await renderHook(() => {
    const result = useAchievements();
    return {...result, isError: result.query.isError};
  }, {wrapper});
  await act(async () => {await hook.result.current.query.refetch();});
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(hook.result.current.unlockedCount).toBe(1);
  mockUserId = 'bruno';
  await hook.rerender(undefined);
  expect(hook.result.current.unlockedCount).toBe(0);
  expect(readAchievementSnapshot('bruno')).toBeUndefined();
});

test('retries a lost reminder response before acknowledging its celebration', async () => {
  const {client} = setup();
  useAchievementLocalStore.getState().markReminder('ana');
  useAchievementLocalStore.getState().dismiss('ana', 'first_reminder');
  repository.reminderCreated.mockRejectedValueOnce(new Error('Offline'));
  await expect(synchronizeAchievements('ana', client)).rejects.toThrow('Offline');
  expect(repository.acknowledge).not.toHaveBeenCalled();
  await synchronizeAchievements('ana', client);
  expect(client.getQueryData(achievementKey('ana'))).toEqual(earned);
  expect(readAchievementSnapshot('ana')).toEqual(earned);
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBeUndefined();
  expect(useAchievementLocalStore.getState().pendingAcknowledgements.ana).toEqual([]);
  expect(useAchievementLocalStore.getState().seen.ana).toEqual(['first_reminder']);
  await synchronizeAchievements('ana', client);
  expect(repository.acknowledge).toHaveBeenCalledTimes(1);
});

test('does not send the pending event using a different account token after cancellation', async () => {
  const {client} = setup();
  useAchievementLocalStore.getState().markReminder('ana');
  jest.spyOn(client, 'cancelQueries').mockImplementation(async () => {mockUserId = 'bruno';});
  await synchronizeAchievements('ana', client);
  expect(repository.reminderCreated).not.toHaveBeenCalled();
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBeTruthy();
});

test('ignores a reminder response received after an account switch', async () => {
  const {client} = setup();
  useAchievementLocalStore.getState().markReminder('ana');
  repository.reminderCreated.mockImplementation(async () => {mockUserId = 'bruno'; return earned;});
  await synchronizeAchievements('ana', client);
  expect(client.getQueryData(achievementKey('bruno'))).toBeUndefined();
  expect(readAchievementSnapshot('ana')).toBeUndefined();
  expect(useAchievementLocalStore.getState().pendingReminders.ana).toBeTruthy();
});

test('drains celebrations dismissed while another acknowledgement is in flight without duplicate requests', async () => {
  const {client} = setup();
  useAchievementLocalStore.getState().dismiss('ana', 'first_drop');
  let finish!: () => void;
  repository.acknowledge.mockImplementationOnce(() => new Promise(resolve => {finish = () => resolve({code: 'first_drop', celebrated_at: '2026-09-04T13:00:00Z'});}));
  const first = synchronizeAchievements('ana', client);
  expect(synchronizeAchievements('ana', client)).toBe(first);
  useAchievementLocalStore.getState().dismiss('ana', 'first_goal');
  finish();
  await first;
  expect(repository.acknowledge.mock.calls).toEqual([['first_drop'], ['first_goal']]);
  expect(useAchievementLocalStore.getState().pendingAcknowledgements.ana).toEqual([]);
});

test('syncs a reminder created during another acknowledgement before confirming its own celebration', async () => {
  const {client} = setup();
  const requests: string[] = [];
  useAchievementLocalStore.getState().dismiss('ana', 'first_drop');
  repository.acknowledge.mockImplementation(async code => {
    requests.push(code);
    if (code === 'first_drop') {
      useAchievementLocalStore.getState().markReminder('ana');
      useAchievementLocalStore.getState().dismiss('ana', 'first_reminder');
    }
    return {code, celebrated_at: '2026-09-04T13:00:00Z'};
  });
  repository.reminderCreated.mockImplementation(async () => {requests.push('reminder_created'); return earned;});
  await synchronizeAchievements('ana', client);
  expect(requests).toEqual(['first_drop', 'reminder_created', 'first_reminder']);
});

test('queues each earned modal once and allows immediate dismissal', async () => {
  jest.useFakeTimers();
  const {wrapper, client} = setup();
  const collection = {...earned, unlocked_count: 2, items: earned.items.map(item => item.code === 'first_drop' ? {...item, unlocked_at: '2026-09-04T12:00:00Z', progress: 1} : item)};
  client.setQueryData(achievementKey('ana'), collection);
  const view = await render(<AchievementProvider />, {wrapper});
  await act(async () => {jest.advanceTimersByTime(500);});
  expect(view.getByText('Primeira gota')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
  await act(async () => {jest.advanceTimersByTime(500);});
  expect(view.getByText('Na hora certa')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Fechar'}));
  await act(async () => {jest.advanceTimersByTime(1000);});
  expect(view.queryByText('NOVA CONQUISTA')).toBeNull();
  expect(useAchievementLocalStore.getState().seen.ana).toEqual(['first_drop', 'first_reminder']);
  await view.unmount();
  const reopened = await render(<AchievementProvider />, {wrapper});
  await act(async () => {jest.advanceTimersByTime(500);});
  expect(reopened.queryByText('NOVA CONQUISTA')).toBeNull();
});

test('waits for the user to close achievement details before opening a celebration', async () => {
  jest.useFakeTimers();
  const {wrapper, client} = setup();
  client.setQueryData(achievementKey('ana'), earned);
  useAchievementLocalStore.setState({detailOpen: true});
  const view = await render(<AchievementProvider />, {wrapper});
  await act(async () => {jest.advanceTimersByTime(500);});
  expect(view.queryByText('NOVA CONQUISTA')).toBeNull();
  await act(async () => {useAchievementLocalStore.getState().setDetailOpen(false);});
  await act(async () => {jest.advanceTimersByTime(500);});
  expect(view.getByText('NOVA CONQUISTA')).toBeTruthy();
});
