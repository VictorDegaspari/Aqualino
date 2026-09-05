import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {HydrationChallenges} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';
import {AppError} from '../../../shared/errors/AppError';
import {hydrationService} from '../../hydration/application/hydrationService';
import {hydrationHomeKey} from '../../hydration/presentation/useHydrationHome';
import {useChallengeActions} from '../presentation/useChallengeActions';

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-community/netinfo', () => ({useNetInfo: () => ({isConnected: true})}));
jest.mock('../../../shared/api/apiClient', () => ({apiRequest: jest.fn()}));
jest.mock('../../hydration/application/hydrationService', () => ({hydrationService: {rememberChallenges: jest.fn().mockResolvedValue(undefined)}}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: {getState: () => ({refreshUser: mockRefreshUser})}}));

const challenges: HydrationChallenges = {
  solo: {
    id: 'solo', mode: 'solo', status: 'active', starts_at: '2026-09-02T12:00:00Z', ends_at: '2026-09-09T03:00:00Z',
    progress: {mode: 'challenge', starts_on: '2026-09-02', ends_on: '2026-09-08', current_date: '2026-09-02', timezone: 'America/Sao_Paulo', days: [], total_ml: 0, completed_goal_days: 0},
    reward: {state: 'locked', type: null, amount: null},
  }, group: null, group_name: null, can_start_group: false,
};

async function setup() {
  const client = new QueryClient({defaultOptions: {queries: {gcTime: Infinity}, mutations: {retry: false, gcTime: Infinity}}});
  client.setQueryData(hydrationHomeKey, {data: {challenges: {...challenges, solo: null}}, offline: false});
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const view = await renderHook(useChallengeActions, {wrapper: ({children}: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>});
  return {...view, client, invalidate};
}

beforeEach(() => jest.clearAllMocks());

test('shows and persists the server challenge before refetching Home', async () => {
  jest.mocked(apiRequest).mockResolvedValue(challenges);
  const {result, client} = await setup();
  await act(() => result.current.start('solo'));
  await waitFor(() => expect(result.current.starting).toBe(false));
  expect(apiRequest).toHaveBeenCalledWith('/hydration/challenges', expect.objectContaining({method: 'POST', body: {mode: 'solo'}}));
  expect(client.getQueryData(hydrationHomeKey)).toMatchObject({data: {challenges}});
  expect(hydrationService.rememberChallenges).toHaveBeenCalledWith(challenges);
});

test('does not invent or queue a challenge when starting cannot be confirmed', async () => {
  jest.mocked(apiRequest).mockRejectedValue(new AppError('Queued', 'NETWORK_UNAVAILABLE'));
  const {result, client} = await setup();
  await act(async () => {
    await expect(result.current.start('solo')).rejects.toThrow('Conecte-se à internet');
  });
  await waitFor(() => expect(result.current.startError).toContain('Conecte-se à internet'));
  expect(client.getQueryData(hydrationHomeKey)).toMatchObject({data: {challenges: {solo: null}}});
  expect(hydrationService.rememberChallenges).not.toHaveBeenCalled();
});

test('keeps the drawn reward and refreshes the inventory and XP from the server', async () => {
  const claimed = {...challenges.solo!, reward: {state: 'claimed' as const, type: 'streak_freeze' as const, amount: 1}};
  jest.mocked(apiRequest).mockResolvedValue(claimed);
  const {result, client, invalidate} = await setup();
  await act(async () => {
    await result.current.claim('solo');
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(client.getQueryData(hydrationHomeKey)).toMatchObject({data: {challenges: {solo: claimed}}});
  expect(hydrationService.rememberChallenges).toHaveBeenCalledWith({...challenges, solo: claimed});
  expect(invalidate).toHaveBeenCalledWith({queryKey: ['inventory']});
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
});
