import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';
import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {hydrationService} from '../application/hydrationService';
import {OfflineSyncProvider} from '../presentation/OfflineSyncProvider';

jest.mock('@react-native-community/netinfo', () => ({addEventListener: jest.fn(() => jest.fn())}));
jest.mock('../application/hydrationService', () => ({hydrationService: {flush: jest.fn(), pendingCount: jest.fn()}}));
jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => 'test-token'}}));
jest.mock('../../auth/application/sessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({status: 'signedIn', user: null}),
}));
jest.mock('../../auth/application/emailVerification', () => ({requiresEmailVerification: () => false}));

test('refreshes Home and history when synchronization only rejects records, even if the counter fails', async () => {
  jest.mocked(hydrationService.flush).mockResolvedValue({synced: 0, rejected: 1});
  jest.mocked(hydrationService.pendingCount).mockResolvedValueOnce(1).mockRejectedValue(new Error('Counter failed'));
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  const view = await render(<QueryClientProvider client={client}><OfflineSyncProvider /></QueryClientProvider>);
  await waitFor(() => expect(NetInfo.addEventListener).toHaveBeenCalled(), {timeout: 2000});

  await act(() => {
    jest.mocked(NetInfo.addEventListener).mock.calls[0][0]({isConnected: true} as NetInfoState);
  });

  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({queryKey: ['hydration']}));
  expect(invalidate).toHaveBeenCalledWith({queryKey: ['achievements']});
  await view.unmount();
  client.clear();
});
