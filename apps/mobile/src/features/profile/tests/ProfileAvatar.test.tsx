import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {User} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {getAvatarSource} from '../../../shared/avatars/avatarOptions';
import {authRepository} from '../../auth/data/authRepository';
import {ProfileScreen} from '../presentation/ProfileScreen';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {hydrationRemoteRepository} from '../../hydration/data/hydrationRemoteRepository';

let mockUser: User;
const mockSignOut = jest.fn();
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
const mockRefetchHydration = jest.fn().mockResolvedValue(undefined);
let mockGoal = 2000;
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({user: mockUser, refreshUser: mockRefreshUser, signOut: mockSignOut})}));
jest.mock('../../auth/data/authRepository', () => ({authRepository: {updateProfile: jest.fn()}}));
jest.mock('../../hydration/presentation/useHydrationHome', () => ({useHydrationHomeData: () => ({data: {data: {today: {goal_ml: mockGoal, total_ml: 0}}}, refetch: mockRefetchHydration})}));
jest.mock('../../hydration/data/hydrationRemoteRepository', () => ({hydrationRemoteRepository: {updateGoal: jest.fn()}}));
jest.mock('../../friends/presentation/ProfileFriends', () => ({ProfileFriends: () => null}));
jest.mock('../../achievements/presentation/ProfileAchievements', () => ({ProfileAchievements: () => null}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGoal = 2000;
  jest.mocked(hydrationRemoteRepository.updateGoal).mockImplementation(async amount => {mockGoal = amount;});
  useOnboardingPreferencesStore.setState({locale: 'pt-BR'});
  mockUser = {id: 'new-user', email: 'ana@example.com', profile: {
    user_id: 'new-user', display_name: 'Ana', username: 'ana', avatar_url: null,
    timezone: 'America/Sao_Paulo', locale: 'pt-BR', favorite_volumes_ml: [200, 300, 500], onboarding_completed_at: null,
  }};
  jest.mocked(authRepository.updateProfile).mockImplementation(async input => {
    mockUser = {...mockUser, profile: {...mockUser.profile, avatar_url: input.avatar_url ?? null}};
    return mockUser.profile;
  });
});

test('edits the personal goal from settings and refreshes hydration after saving', async () => {
  const view = await renderProfile();
  expect(view.queryByTestId('profile-goal')).toBeNull();
  await fireEvent.press(view.getByTestId('profile-settings'));
  expect(view.getByText('2.000 ml por dia')).toBeTruthy();
  await fireEvent.press(view.getByTestId('profile-goal'));
  expect(view.getByTestId('profile-goal-input')).toHaveDisplayValue('2000');
  await fireEvent.changeText(view.getByTestId('profile-goal-input'), '2500');
  await fireEvent.press(view.getByTestId('profile-goal-save'));
  expect(hydrationRemoteRepository.updateGoal).toHaveBeenCalledWith(2500);
  expect(mockRefetchHydration).toHaveBeenCalledTimes(1);
  expect(view.getByText('2.500 ml por dia')).toBeTruthy();
  expect(view.getByText('Meta salva.')).toBeTruthy();
  await fireEvent.press(view.getByTestId('profile-settings-close'));
  await fireEvent.press(view.getByTestId('profile-settings'));
  await fireEvent.press(view.getByTestId('profile-goal'));
  expect(view.getByTestId('profile-goal-input')).toHaveDisplayValue('2500');
});

test('rejects invalid goals and cancels an edit without saving', async () => {
  const view = await renderProfile();
  await fireEvent.press(view.getByTestId('profile-settings'));
  await fireEvent.press(view.getByTestId('profile-goal'));
  for (const amount of ['', '499', '10001', '500.5']) {
    await fireEvent.changeText(view.getByTestId('profile-goal-input'), amount);
    expect(view.getByTestId('profile-goal-save')).toBeDisabled();
  }
  await fireEvent.changeText(view.getByTestId('profile-goal-input'), '3000');
  await fireEvent.press(view.getByRole('button', {name: 'Cancelar'}));
  expect(hydrationRemoteRepository.updateGoal).not.toHaveBeenCalled();
  expect(view.getByText('2.000 ml por dia')).toBeTruthy();
});

test('prevents duplicate saves and preserves the entered goal after an error', async () => {
  let fail!: (error: Error) => void;
  jest.mocked(hydrationRemoteRepository.updateGoal).mockImplementationOnce(() => new Promise((_resolve, reject) => {fail = reject;}));
  const view = await renderProfile();
  await fireEvent.press(view.getByTestId('profile-settings'));
  await fireEvent.press(view.getByTestId('profile-goal'));
  await fireEvent.changeText(view.getByTestId('profile-goal-input'), '3000');
  await fireEvent.press(view.getByTestId('profile-goal-save'));
  await fireEvent.press(view.getByTestId('profile-goal-save'));
  expect(hydrationRemoteRepository.updateGoal).toHaveBeenCalledTimes(1);
  expect(view.getByTestId('profile-settings-close')).toBeDisabled();
  expect(view.getByTestId('profile-logout')).toBeDisabled();
  await act(() => fail(new Error('Offline')));
  expect(view.getByRole('alert')).toHaveTextContent('Não foi possível salvar a meta. Tente novamente.');
  expect(view.getByTestId('profile-goal-input')).toHaveDisplayValue('3000');
  expect(mockRefetchHydration).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('profile-goal-save'));
  expect(view.getByText('3.000 ml por dia')).toBeTruthy();
});

test('changes the app to Spanish from the profile and persists the selection', async () => {
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Configurações'}));
  await fireEvent.press(view.getByRole('button', {name: /Idioma do app/}));
  await fireEvent.press(view.getByRole('radio', {name: 'Español, España'}));
  await waitFor(() => expect(view.getByText('Idioma de la app')).toBeTruthy());
  expect(authRepository.updateProfile).toHaveBeenCalledWith({locale: 'es-ES'});
  expect(useOnboardingPreferencesStore.getState().locale).toBe('es-ES');
  expect(view.getByRole('button', {name: 'Cerrar sesión'})).toBeTruthy();
});

test('keeps the current language when saving the preference fails', async () => {
  jest.mocked(authRepository.updateProfile).mockRejectedValueOnce(new Error('Offline'));
  const view = await renderProfile();
  await fireEvent.press(view.getByRole('button', {name: 'Configurações'}));
  await fireEvent.press(view.getByRole('button', {name: /Idioma do app/}));
  await fireEvent.press(view.getByRole('radio', {name: 'Español, España'}));
  await waitFor(() => expect(view.getByText('Não foi possível salvar suas preferências.')).toBeTruthy());
  expect(useOnboardingPreferencesStore.getState().locale).toBe('pt-BR');
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
  await waitFor(() => expect(mockRefreshUser).toHaveBeenCalledTimes(2));
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
  expect(mockRefreshUser).toHaveBeenCalledTimes(1);
});

test.each([null, undefined, 'unknown', 'toString'])('does not supply a default image for an unselected or invalid avatar: %s', value => {
  expect(getAvatarSource(value)).toBeUndefined();
});


test('opens language and sign out only through settings and closes the panel', async () => {
  const view = await renderProfile();
  expect(view.queryByRole('button', {name: 'Sair da conta'})).toBeNull();
  expect(view.queryByRole('button', {name: /Idioma do app/})).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Configurações'}));
  expect(view.getByRole('button', {name: /Idioma do app/})).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Sair da conta'}));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByRole('button', {name: 'Fechar'}));
  expect(view.queryByTestId('profile-settings-panel')).toBeNull();
  expect(view.getByRole('button', {name: 'Configurações'})).toBeTruthy();
});
