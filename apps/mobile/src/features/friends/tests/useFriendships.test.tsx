import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {FriendshipCollection} from '@aqualino/contracts';
import {friendshipRepository} from '../data/friendshipRepository';
import {useFriendshipActions, useFriendships} from '../presentation/useFriendships';

let mockUserId = 'ana';
jest.mock('../../auth/application/sessionStore', () => {
  const state = () => ({user: {id: mockUserId}});
  return {useSessionStore: Object.assign((selector: (value: unknown) => unknown) => selector(state()), {getState: state})};
});
jest.mock('../data/friendshipRepository', () => ({friendshipRepository: {list: jest.fn(), search: jest.fn(), profile: jest.fn(), change: jest.fn()}}));
const repository = jest.mocked(friendshipRepository);
const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity}, mutations: {retry: false, gcTime: Infinity}}});
  clients.push(client);
  return {client, wrapper: ({children}: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>};
}
beforeEach(() => {jest.clearAllMocks(); mockUserId = 'ana';});
afterEach(() => {clients.splice(0).forEach(client => client.clear());});

test('an old account response cannot populate the current account friend list', async () => {
  let finish!: (value: FriendshipCollection) => void;
  repository.list.mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const {wrapper} = setup();
  const hook = await renderHook(() => useFriendships(''), {wrapper});
  await waitFor(() => expect(repository.list).toHaveBeenCalledTimes(1));
  mockUserId = 'bruno';
  repository.list.mockResolvedValue({friends: [], incoming: [], outgoing: []});
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.list.isSuccess).toBe(true));
  await act(async () => {finish({friends: [{id: 'carla', username: 'carla', display_name: 'Carla', avatar_url: null, level: 1, relationship: 'friends'}], incoming: [], outgoing: []});});
  expect(hook.result.current.list.data?.friends).toEqual([]);
});

test('successful friendship actions refresh lists and profiles, while stale sessions cannot send requests', async () => {
  const {client, wrapper} = setup();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  repository.change.mockResolvedValue({id: 'bruno', username: 'bruno', display_name: 'Bruno', avatar_url: null, level: 1, relationship: 'outgoing'});
  const hook = await renderHook(() => useFriendshipActions(), {wrapper});
  await act(async () => {await hook.result.current.mutateAsync({personId: 'bruno', action: 'request'});});
  expect(repository.change).toHaveBeenCalledWith('bruno', 'request');
  expect(invalidate).toHaveBeenCalledWith({queryKey: ['friends', 'ana']});
  expect(invalidate).toHaveBeenCalledWith({queryKey: ['people', 'ana']});
  mockUserId = 'carla';
  await act(async () => {await expect(hook.result.current.mutateAsync({personId: 'bruno', action: 'request'})).rejects.toThrow('Session changed');});
  expect(repository.change).toHaveBeenCalledTimes(1);
});
