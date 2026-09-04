import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {PrivateGroup} from '@aqualino/contracts';
import {AppError} from '../../../shared/errors/AppError';
import {groupsRepository} from '../data/groupsRepository';
import {groupsCopy} from '../presentation/groupsCopy';
import {groupKey, useGroups} from '../presentation/useGroups';

let mockUserId = 'ana';
jest.mock('../../auth/application/sessionStore', () => ({
  useSessionStore: {getState: () => ({user: {id: mockUserId}})},
}));
jest.mock('../data/groupsRepository', () => ({groupsRepository: {
  current: jest.fn(), create: jest.fn(), preview: jest.fn(), accept: jest.fn(), renewInvite: jest.fn(), leave: jest.fn(),
}}));

const repository = jest.mocked(groupsRepository);
const group: PrivateGroup = {
  id: 'group-1', name: 'Maré de amigos', owner_id: 'ana', timezone: 'UTC', max_members: 5,
  members: [{user_id: 'ana', display_name: 'Ana', avatar_url: null, role: 'owner'}],
  invite: {code: 'ABC123DEF456', expires_at: '2099-01-01T00:00:00Z'},
};
const clients: QueryClient[] = [];

beforeEach(() => {
  jest.resetAllMocks();
  mockUserId = 'ana';
  repository.current.mockResolvedValue(null);
});
afterEach(() => clients.splice(0).forEach(client => client.clear()));

async function setup() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity, staleTime: Infinity}}});
  clients.push(client);
  const wrapper = ({children}: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = await renderHook(() => useGroups(mockUserId, groupsCopy['pt-BR']), {wrapper});
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return {...hook, client};
}

test('updates the account cache after creation and clears it on leaving', async () => {
  repository.create.mockResolvedValue(group);
  repository.leave.mockResolvedValue(null);
  const {result, client} = await setup();
  await act(async () => {expect(await result.current.create('Maré de amigos')).toBe(true);});
  expect(result.current.group).toEqual(group);
  expect(client.getQueryData(groupKey('ana'))).toEqual(group);
  await act(async () => {expect(await result.current.leave()).toBe(true);});
  expect(result.current.group).toBeNull();
});

test('keeps failed changes out of cache and returns a connection message', async () => {
  repository.create.mockRejectedValue(new AppError('generic hydration error', 'NETWORK_UNAVAILABLE'));
  const {result, client} = await setup();
  await act(async () => {expect(await result.current.create('Maré de amigos')).toBe(false);});
  expect(result.current.error).toBe(groupsCopy['pt-BR'].networkError);
  expect(client.getQueryData(groupKey('ana'))).toBeNull();
  expect(result.current.busy).toBe(false);
});

test('ignores a response that arrives after switching accounts', async () => {
  let resolveCreate!: (value: PrivateGroup) => void;
  repository.create.mockImplementation(() => new Promise(resolve => {resolveCreate = resolve;}));
  const {result, client} = await setup();
  let operation!: Promise<boolean>;
  await act(async () => {operation = result.current.create('Maré de amigos');});
  mockUserId = 'bruno';
  await act(async () => {resolveCreate(group); expect(await operation).toBe(false);});
  expect(client.getQueryData(groupKey('ana'))).toBeNull();
  expect(client.getQueryData(groupKey('bruno'))).not.toEqual(group);
});

test('blocks duplicate submissions while a change is pending', async () => {
  let resolveCreate!: (value: PrivateGroup) => void;
  repository.create.mockImplementation(() => new Promise(resolve => {resolveCreate = resolve;}));
  const {result} = await setup();
  let operation!: Promise<boolean>;
  await act(async () => {
    operation = result.current.create('Maré de amigos');
    expect(await result.current.create('Duplicate')).toBe(false);
  });
  expect(repository.create).toHaveBeenCalledTimes(1);
  await act(async () => {resolveCreate(group); await operation;});
});

test('does not send a change with the token of a newly selected account', async () => {
  const {result, client} = await setup();
  jest.spyOn(client, 'cancelQueries').mockImplementation(async () => {mockUserId = 'bruno';});
  await act(async () => {expect(await result.current.create('Maré de amigos')).toBe(false);});
  expect(repository.create).not.toHaveBeenCalled();
});

test('recovers a previously successful creation after a lost response', async () => {
  repository.create.mockRejectedValue(new AppError('Already joined', 'GROUP_ALREADY_JOINED', 409));
  const {result} = await setup();
  repository.current.mockResolvedValue(group);
  await act(async () => {await result.current.create('Maré de amigos');});
  await waitFor(() => expect(result.current.group).toEqual(group));
});
