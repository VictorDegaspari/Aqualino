import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {createGestureController} from 'react-native-gesture-handler/jest-utils';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {PersonProfile, PersonSummary} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {FriendsScreen} from '../presentation/FriendsScreen';
import {FriendshipButtons} from '../presentation/FriendshipButtons';
import {ProfileFriends} from '../presentation/ProfileFriends';
import {PersonProfileScreen, PersonProfileView} from '../presentation/PersonProfileScreen';
import {useFriendshipActions, useFriendships, usePersonProfile} from '../presentation/useFriendships';
import {emptyAchievementCollection} from '../../achievements/application/achievementCatalog';

jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({user: {id: 'ana'}})}));
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../presentation/useFriendships', () => ({useFriendships: jest.fn(), useFriendshipActions: jest.fn(), usePersonProfile: jest.fn()}));
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({useOnboardingPreferencesStore: (selector: (state: {locale: string}) => unknown) => selector({locale: 'pt-BR'})}));
const person: PersonSummary = {id: 'bruno', display_name: 'Bruno', username: 'bruno', avatar_url: 'avatar_1', level: 5, relationship: 'incoming'};
const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 0, bottom: 0, left: 0, right: 0}}}><GestureHandlerRootView>{children}</GestureHandlerRootView></SafeAreaProvider>;
const mutate = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFriendships).mockReturnValue({list: {data: {friends: [], incoming: [person], outgoing: []}, refetch: jest.fn()}, people: {data: [], refetch: jest.fn()}} as unknown as ReturnType<typeof useFriendships>);
  jest.mocked(useFriendshipActions).mockReturnValue({mutate, isPending: false, isError: false} as unknown as ReturnType<typeof useFriendshipActions>);
});

test('opens a received request profile and explicitly accepts or declines the request', async () => {
  const navigate = jest.fn();
  const view = await render(<FriendsScreen navigation={{navigate, goBack: jest.fn()} as unknown as NativeStackScreenProps<RootStackParamList, 'Friends'>['navigation']} route={{key: 'friends', name: 'Friends'}} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Ver perfil de Bruno'}));
  expect(navigate).toHaveBeenCalledWith('PersonProfile', {userId: 'bruno'});
  await fireEvent.press(view.getByRole('button', {name: 'Aceitar pedido'}));
  expect(mutate).toHaveBeenLastCalledWith({personId: 'bruno', action: 'accept'});
  await fireEvent.press(view.getByRole('button', {name: 'Recusar'}));
  expect(mutate).toHaveBeenLastCalledWith({personId: 'bruno', action: 'remove'});
  expect(view.queryByTestId('friends-search-input')).toBeNull();
  expect(view.queryByRole('button', {name: 'Buscar'})).toBeNull();
});

test('searches for new friends in the dedicated add screen without mixing in the list', async () => {
  const view = await render(<FriendsScreen navigation={{navigate: jest.fn(), goBack: jest.fn()} as unknown as NativeStackScreenProps<RootStackParamList, 'AddFriends'>['navigation']} route={{key: 'add-friends', name: 'AddFriends'}} />, {wrapper});
  expect(view.getByRole('header', {name: 'Adicionar amigos'})).toBeTruthy();
  expect(view.queryByText('Seus amigos')).toBeNull();
  expect(view.queryByText('Pedidos recebidos')).toBeNull();
  expect(view.queryByText('Pedidos enviados')).toBeNull();
  await fireEvent.changeText(view.getByTestId('friends-search-input'), '@ANA');
  await fireEvent.press(view.getByRole('button', {name: 'Buscar'}));
  expect(useFriendships).toHaveBeenLastCalledWith('ana');
  await fireEvent.changeText(view.getByTestId('friends-search-input'), 'a');
  await fireEvent.press(view.getByRole('button', {name: 'Buscar'}));
  expect(view.getByRole('alert')).toHaveTextContent(/Digite de 3 a 24/);
});

test('offers the appropriate friendship action and prevents repeated taps while saving', async () => {
  const onAction = jest.fn();
  const view = await render(<FriendshipButtons status="none" busy={false} onAction={onAction} />);
  await fireEvent.press(view.getByRole('button', {name: 'Adicionar amizade'}));
  expect(onAction).toHaveBeenCalledWith('request');
  await view.rerender(<FriendshipButtons status="outgoing" busy={false} onAction={onAction} />);
  expect(view.queryByRole('button', {name: 'Aceitar pedido'})).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Cancelar pedido'}));
  expect(onAction).toHaveBeenLastCalledWith('remove');
  await view.rerender(<FriendshipButtons status="friends" busy onAction={onAction} />);
  expect(view.getByRole('button', {name: 'Remover amizade'})).toBeDisabled();
  await view.rerender(<FriendshipButtons status="self" busy={false} onAction={onAction} />);
  expect(view.queryAllByRole('button')).toHaveLength(0);
});

test('shows another person’s medals, selected highlights and earned achievements with details', async () => {
  const achievement = {...emptyAchievementCollection.items[0], unlocked_at: '2026-09-04T12:00:00Z', progress: 1};
  const profile: PersonProfile = {...person, group_medals: {gold: 2, silver: 1, bronze: 0}, achievements: [achievement], profile_highlights: ['first_drop'], hydration_week: {starts_on: '2026-09-07', ends_on: '2026-09-13', current_date: '2026-09-08', total_ml: 3000, average_daily_ml: 1500, days: Array.from({length: 7}, (_, i) => ({date: `2026-09-${String(7 + i).padStart(2, '0')}`, total_ml: i === 0 ? 3000 : 0}))}};
  const onSelect = jest.fn();
  const view = await render(<PersonProfileView person={profile} onSelect={onSelect} />);
  expect(view.getByText('Bruno')).toBeTruthy();
  expect(view.getByTestId('profile-weekly-hydration')).toHaveTextContent(/1,5 L\/dia/);
  expect(view.getByText('Total da semana: 3 L')).toBeTruthy();
  expect(view.getByLabelText('2026-09-08: 0 L')).toBeTruthy();
  expect(view.getByLabelText('2026-09-09: Ainda não chegou')).toBeTruthy();
  expect(view.queryByTestId('profile-friends')).toBeNull();
  expect(view.queryByText(/número de amigos/)).toBeNull();
  expect(view.getByText('2 × Ouro')).toBeTruthy();
  expect(view.getByText('1 × Prata')).toBeTruthy();
  expect(view.getByText('Destaques do perfil')).toBeTruthy();
  expect(view.queryByText('Editar destaques')).toBeNull();
  await fireEvent.press(view.getAllByRole('button', {name: 'Primeira gota'})[0]);
  expect(onSelect).toHaveBeenCalledWith(achievement);
  await view.rerender(<PersonProfileView person={{...profile, profile_highlights: [], achievements: []}} onSelect={onSelect} />);
  expect(view.queryByText('Destaques do perfil')).toBeNull();
  expect(view.getByText('As conquistas aparecerão aqui.')).toBeTruthy();
});

test('own profile counts accepted friends and dispatches separate view and add actions', async () => {
  jest.mocked(useFriendships).mockReturnValue({list: {data: {friends: [person, {...person, id: 'carla'}], incoming: [person], outgoing: [person]}, refetch: jest.fn()}, people: {}} as unknown as ReturnType<typeof useFriendships>);
  const onOpen = jest.fn();
  const onAdd = jest.fn();
  const view = await render(<ProfileFriends onOpen={onOpen} onAdd={onAdd} />);
  await fireEvent.press(view.getByRole('button', {name: '2 amigos'}));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onAdd).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Adicionar amigos'}));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(view.queryByText('Só você vê seu número de amigos.')).toBeNull();
});

test('participant profile offers adding a friend directly below their identity', async () => {
  jest.mocked(usePersonProfile).mockReturnValue({data: {...person, relationship: 'none', group_medals: {gold: 0, silver: 0, bronze: 0}, achievements: [], profile_highlights: []}, isPending: false, refetch: jest.fn()} as unknown as ReturnType<typeof usePersonProfile>);
  const view = await render(<PersonProfileScreen navigation={{goBack: jest.fn()} as unknown as NativeStackScreenProps<RootStackParamList, 'PersonProfile'>['navigation']} route={{key: 'person', name: 'PersonProfile', params: {userId: 'bruno'}}} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Adicionar amizade'}));
  expect(mutate).toHaveBeenCalledWith({personId: 'bruno', action: 'request'});
  expect(view.queryByTestId('profile-friends')).toBeNull();
});

test.each(['friends', 'add-friends', 'person-profile'] as const)('swipes %s back and supports the visible back button', async screen => {
  const goBack = jest.fn();
  jest.mocked(usePersonProfile).mockReturnValue({isPending: true, refetch: jest.fn()} as unknown as ReturnType<typeof usePersonProfile>);
  const content = () => screen === 'friends'
    ? <FriendsScreen navigation={{navigate: jest.fn(), goBack} as unknown as NativeStackScreenProps<RootStackParamList, 'Friends'>['navigation']} route={{key: 'friends', name: 'Friends'}} />
    : screen === 'add-friends' ? <FriendsScreen navigation={{navigate: jest.fn(), goBack} as unknown as NativeStackScreenProps<RootStackParamList, 'AddFriends'>['navigation']} route={{key: 'add-friends', name: 'AddFriends'}} />
    : <PersonProfileScreen navigation={{goBack} as unknown as NativeStackScreenProps<RootStackParamList, 'PersonProfile'>['navigation']} route={{key: 'person', name: 'PersonProfile', params: {userId: 'bruno'}}} />;
  const view = await render(content(), {wrapper});
  const gesture = createGestureController(`${screen}-back-gesture`);
  await act(async () => {gesture.begin(); gesture.activate(); gesture.update({translationX: 350}); gesture.end({translationX: 350, velocityX: 800});});
  expect(goBack).toHaveBeenCalledTimes(1);
  await view.unmount();
  goBack.mockClear();
  const reopened = await render(content(), {wrapper});
  await fireEvent.press(reopened.getByRole('button', {name: 'Voltar'}));
  expect(goBack).toHaveBeenCalledTimes(1);
});
