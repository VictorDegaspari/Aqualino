import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {User} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {getAvatarSource} from '../../../shared/avatars/avatarOptions';
import {authRepository} from '../../auth/data/authRepository';
import {ProfileScreen} from '../presentation/ProfileScreen';

let mockUser: User;
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({user: mockUser, refreshUser: mockRefreshUser, signOut: jest.fn()})}));
jest.mock('../../auth/data/authRepository', () => ({authRepository: {updateProfile: jest.fn()}}));
jest.mock('../../hydration/presentation/useHydrationHome', () => ({useHydrationHomeData: () => ({data: undefined})}));
jest.mock('../../achievements/presentation/ProfileAchievements', () => ({ProfileAchievements: () => null}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = {id: 'new-user', email: 'ana@example.com', profile: {
    user_id: 'new-user', display_name: 'Ana', username: 'ana', avatar_url: null,
    timezone: 'America/Sao_Paulo', locale: 'pt-BR', favorite_volumes_ml: [200, 300, 500], onboarding_completed_at: null,
  }};
  jest.mocked(authRepository.updateProfile).mockImplementation(async input => {
    mockUser = {...mockUser, profile: {...mockUser.profile, avatar_url: input.avatar_url ?? null}};
    return mockUser.profile;
  });
});

function renderProfile() {
  const props = {navigation: {navigate: jest.fn()}} as unknown as NativeStackScreenProps<RootStackParamList, 'Profile'>;
  return render(<SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, bottom: 0, left: 0, right: 0}}}>
    <AppModalProvider><ProfileScreen {...props} /></AppModalProvider>
  </SafeAreaProvider>);
}

test('starts with no avatar or preselected option and closing the picker keeps it empty', async () => {
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Escolher avatar'}));
  const options = view.getAllByRole('radio');
  expect(options).toHaveLength(8);
  expect(options.every(option => option.props.accessibilityState.checked === false)).toBe(true);
  await fireEvent.press(view.getByRole('button', {name: 'Fechar editor de avatar'}));
  expect(view.getByRole('button', {name: 'Escolher avatar'})).toBeTruthy();
  expect(authRepository.updateProfile).not.toHaveBeenCalled();
});

test('saves the first avatar when explicitly selected and restores it on the next profile visit', async () => {
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Escolher avatar'}));
  await fireEvent.press(view.getByRole('radio', {name: 'Avatar 1'}));
  await waitFor(() => expect(mockRefreshUser).toHaveBeenCalledTimes(1));
  expect(authRepository.updateProfile).toHaveBeenCalledWith({avatar_url: 'avatar_1'});
  expect(view.getByRole('button', {name: 'Editar avatar'})).toBeTruthy();
  await view.unmount();
  const reopened = await renderProfile();
  await fireEvent.press(reopened.getByRole('button', {name: 'Editar avatar'}));
  expect(reopened.getByRole('radio', {name: 'Avatar 1'}).props.accessibilityState.checked).toBe(true);
});

test('preserves an avatar already selected by an existing account', async () => {
  mockUser.profile.avatar_url = 'avatar_6';
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Editar avatar'}));
  expect(view.getByRole('radio', {name: 'Avatar 6'}).props.accessibilityState.checked).toBe(true);
  expect(authRepository.updateProfile).not.toHaveBeenCalled();
});

test('returns to the empty state when the first avatar cannot be saved', async () => {
  jest.mocked(authRepository.updateProfile).mockRejectedValueOnce(new Error('Sem conexão.'));
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Escolher avatar'}));
  await fireEvent.press(view.getByRole('radio', {name: 'Avatar 1'}));
  await waitFor(() => expect(view.getByText('Não foi possível salvar seu avatar')).toBeTruthy());
  await fireEvent.press(view.getByRole('button', {name: 'Entendi'}));
  expect(view.getByRole('button', {name: 'Escolher avatar'})).toBeTruthy();
  expect(mockRefreshUser).not.toHaveBeenCalled();
});

test.each([null, undefined, 'unknown', 'toString'])('does not supply a default image for an unselected or invalid avatar: %s', value => {
  expect(getAvatarSource(value)).toBeUndefined();
});
