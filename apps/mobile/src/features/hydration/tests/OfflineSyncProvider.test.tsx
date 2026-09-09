import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';
import {AppModalProvider} from '../../../shared/components/AppModal';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';
import {OfflineSyncProvider} from '../presentation/OfflineSyncProvider';
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-community/netinfo', () => ({addEventListener: jest.fn(() => jest.fn())}));
jest.mock('../application/hydrationService', () => ({hydrationService: {flush: jest.fn(), pendingCount: jest.fn()}}));
jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => 'test-token'}}));
jest.mock('../../auth/application/sessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({status: 'signedIn', user: null, refreshUser: mockRefreshUser}),
}));
jest.mock('../../auth/application/emailVerification', () => ({requiresEmailVerification: () => false}));

test.each([0, 1])('refreshes progress after sync with %s accepted records, even if the counter fails', async synced => {
  jest.clearAllMocks();
  jest.mocked(hydrationService.flush).mockResolvedValue({synced, rejected: 1});
  jest.mocked(hydrationService.pendingCount).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockRejectedValue(new Error('Counter failed'));
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const view = await render(<QueryClientProvider client={client}><AppModalProvider><OfflineSyncProvider /></AppModalProvider></QueryClientProvider>);
  await waitFor(() => expect(NetInfo.addEventListener).toHaveBeenCalled(), {timeout: 2000});

  await act(() => {
    jest.mocked(NetInfo.addEventListener).mock.calls[0][0]({isConnected: true} as NetInfoState);
  });

  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({queryKey: ['hydration']}));
  expect(invalidate).toHaveBeenCalledWith({queryKey: ['achievements']});
  expect(mockRefreshUser).toHaveBeenCalledTimes(synced);
  await view.unmount();
  client.clear();
});

test.each([true, false, null])('syncs a new record on a connected network with internet validation %s', async isInternetReachable => {
  jest.clearAllMocks();
  jest.mocked(hydrationService.pendingCount).mockResolvedValue(0);
  jest.mocked(hydrationService.flush).mockResolvedValue({synced: 1, rejected: 0});
  const client = new QueryClient();
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const view = await render(<QueryClientProvider client={client}><OfflineSyncProvider /></QueryClientProvider>);
  await waitFor(() => expect(NetInfo.addEventListener).toHaveBeenCalled(), {timeout: 2000});
  await act(() => {jest.mocked(NetInfo.addEventListener).mock.calls[0][0]({isConnected: true, isInternetReachable} as NetInfoState);});
  expect(hydrationService.flush).not.toHaveBeenCalled();
  jest.mocked(hydrationService.pendingCount).mockResolvedValueOnce(1).mockResolvedValue(0);
  await act(() => {useSyncStatusStore.getState().setPending(1);});
  await waitFor(() => expect(hydrationService.flush).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(useSyncStatusStore.getState().pending).toBe(0));
  await view.unmount();
  client.clear();
});

test('clears a stale pending notice when the local queue has already been reconciled', async () => {
  jest.clearAllMocks();
  jest.mocked(hydrationService.pendingCount).mockResolvedValue(0);
  const client = new QueryClient();
  const view = await render(<QueryClientProvider client={client}><OfflineSyncProvider /></QueryClientProvider>);
  await waitFor(() => expect(NetInfo.addEventListener).toHaveBeenCalled(), {timeout: 2000});
  await act(() => {jest.mocked(NetInfo.addEventListener).mock.calls[0][0]({isConnected: true} as NetInfoState);});

  await act(() => {useSyncStatusStore.getState().setPending(2);});

  await waitFor(() => expect(useSyncStatusStore.getState().pending).toBe(0));
  expect(hydrationService.flush).not.toHaveBeenCalled();
  await view.unmount();
  client.clear();
});
