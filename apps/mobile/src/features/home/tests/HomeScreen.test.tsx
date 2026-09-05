import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {launchCamera} from 'react-native-image-picker';
import {HomeScreen} from '../presentation/HomeScreen';
import {AppModalProvider} from '../../../shared/components/AppModal';

const mockNavigation = {navigate: jest.fn(), setParams: jest.fn()};
const mockRefetch = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation, useIsFocused: () => true, useRoute: () => ({params: undefined}),
}));
jest.mock('react-native-image-picker', () => ({launchCamera: jest.fn()}));
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({user: null, refreshUser: mockRefreshUser})}));
jest.mock('../../hydration/presentation/useHydrationHome', () => ({useHydrationHome: () => ({query: {refetch: mockRefetch}})}));
jest.mock('../presentation/useChallengeActions', () => ({useChallengeActions: () => ({start: jest.fn(), claim: jest.fn(), starting: false})}));
jest.mock('../presentation/HomeView', () => ({HomeView: ({onOpenHydration}: {onOpenHydration: () => void}) => {
  const {Button} = require('react-native');
  return <Button title="Bebi água" onPress={onOpenHydration} />;
}}));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}><AppModalProvider>{children}</AppModalProvider></SafeAreaProvider>;

test('opens volume selection only after a photo is taken', async () => {
  jest.mocked(launchCamera).mockResolvedValue({assets: [{uri: 'file:///cup.jpg'}]});
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByText('Bebi água'));

  expect(launchCamera).toHaveBeenCalledTimes(1);
  expect(mockNavigation.navigate).toHaveBeenCalledWith('QuickHydration', {source: 'mobile', photoUri: 'file:///cup.jpg'});
});

test('stays on Home when the required photo is cancelled', async () => {
  jest.mocked(launchCamera).mockResolvedValue({didCancel: true});
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByText('Bebi água'));

  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});

test('explains a camera failure and allows another attempt', async () => {
  jest.mocked(launchCamera).mockResolvedValueOnce({errorCode: 'permission'}).mockResolvedValueOnce({assets: [{uri: 'file:///cup.jpg'}]});
  const view = await render(<HomeScreen />, {wrapper});
  await fireEvent.press(view.getByText('Bebi água'));
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  expect(view.getByRole('header', {name: 'Não foi possível abrir a câmera'})).toBeTruthy();
  expect(view.getByText(/A foto é necessária/)).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Bebi água'})).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Entendi'}));
  await waitFor(() => expect(view.queryByText(/A foto é necessária/)).toBeNull());

  await fireEvent.press(view.getByText('Bebi água'));
  expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
});
