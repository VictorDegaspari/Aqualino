import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {LegacyHydrationRecovery} from '../presentation/LegacyHydrationRecovery';
import {hydrationService} from '../application/hydrationService';

jest.mock('../application/hydrationService', () => ({hydrationService: {
  legacyPendingCount: jest.fn(), recoverLegacy: jest.fn(), flush: jest.fn(), pendingCount: jest.fn(),
}}));
const service = jest.mocked(hydrationService);

async function setup(count: number) {
  jest.clearAllMocks();
  service.legacyPendingCount.mockResolvedValue(count);
  service.recoverLegacy.mockResolvedValue();
  service.flush.mockResolvedValue({synced: count, rejected: 0});
  service.pendingCount.mockResolvedValue(0);
  return render(<QueryClientProvider client={new QueryClient()}>
    <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
      <AppModalProvider><LegacyHydrationRecovery userId="ana" displayName="Ana" enabled /></AppModalProvider>
    </SafeAreaProvider>
  </QueryClientProvider>);
}

test('does not show recovery for an empty legacy queue', async () => {
  const view = await setup(0);
  expect(view.queryByText('Recuperar marcações antigas')).toBeNull();
  expect(service.recoverLegacy).not.toHaveBeenCalled();
});

test('keeps unknown ownership untouched when recovery is dismissed', async () => {
  const view = await setup(2);
  await waitFor(() => expect(view.getByText('Recuperar marcações antigas')).toBeTruthy());
  expect(service.recoverLegacy).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Agora não'}));
  expect(service.recoverLegacy).not.toHaveBeenCalled();
  expect(service.flush).not.toHaveBeenCalled();
});

test('binds old records only to the explicitly selected profile before syncing', async () => {
  const view = await setup(2);
  await waitFor(() => expect(view.getByRole('button', {name: 'Vincular a Ana'})).toBeTruthy());
  await fireEvent.press(view.getByRole('button', {name: 'Vincular a Ana'}));
  await waitFor(() => expect(service.flush).toHaveBeenCalledTimes(1));
  expect(service.recoverLegacy).toHaveBeenCalledWith('ana');
});
