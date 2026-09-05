import React from 'react';
import {act, render, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {hydrationHomeKey} from '../../hydration/presentation/useHydrationHome';
import {ProfileScreen} from '../presentation/ProfileScreen';

jest.mock('../../hydration/application/hydrationService', () => ({hydrationService: {cachedOrRemote: jest.fn()}}));
jest.mock('@react-native-community/netinfo', () => ({useNetInfo: () => ({isConnected: true})}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({
  user: {streak: 9, level: 2, profile: {display_name: 'Ana', username: 'ana'}},
  refreshUser: jest.fn(), signOut: jest.fn(),
})}));
jest.mock('../../auth/data/authRepository', () => ({authRepository: {updateProfile: jest.fn()}}));
jest.mock('../../achievements/presentation/ProfileAchievements', () => ({ProfileAchievements: () => null}));

const offLabel = 'Fogo apagado: você ainda não bebeu água hoje';
const onLabel = 'Fogo aceso: você já bebeu água hoje';

async function setup(totalMl: number) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, gcTime: Infinity}}});
  client.setQueryData(hydrationHomeKey, {data: {today: {total_ml: totalMl}}});
  const props = {navigation: {navigate: jest.fn()}} as unknown as NativeStackScreenProps<RootStackParamList, 'Profile'>;
  const view = await render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 44, right: 0, bottom: 34, left: 0}}}>
        <ProfileScreen {...props} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  return {client, view};
}

test('keeps the flame off before drinking today even with an existing streak', async () => {
  const {view} = await setup(0);
  expect(view.getByLabelText(offLabel)).toBeTruthy();
  expect(view.queryByLabelText(onLabel)).toBeNull();
  expect(view.getByText('9')).toBeTruthy();
});

test('lights the profile flame from the same updated daily total as Home and resets for the next day', async () => {
  const {view, client} = await setup(0);
  await act(() => {client.setQueryData(hydrationHomeKey, {data: {today: {total_ml: 1}}});});
  await waitFor(() => expect(view.getByLabelText(onLabel)).toBeTruthy());

  await act(() => {client.setQueryData(hydrationHomeKey, {data: {today: {total_ml: 0}}});});
  await waitFor(() => expect(view.getByLabelText(offLabel)).toBeTruthy());
});
