import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {GroupsScreen} from '../presentation/GroupsScreen';

const mockGroups = {
  group: {
    id: 'group', name: 'Maré de amigos', timezone: 'America/Sao_Paulo', owner_id: 'ana', max_members: 5,
    members: [{user_id: 'ana', display_name: 'Ana', avatar_url: null, role: 'owner'}],
    invite: {code: 'ABC123DEF456', expires_at: '2099-09-12T00:00:00Z'},
  },
  loading: false, refreshing: false, busy: false,
  refresh: jest.fn(), clearError: jest.fn(), create: jest.fn(), preview: jest.fn(), accept: jest.fn(),
  renewInvite: jest.fn().mockResolvedValue(true), leave: jest.fn().mockResolvedValue(true),
};
jest.mock('../presentation/useGroups', () => ({useGroups: () => mockGroups}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({
  user: {id: 'ana', profile: {display_name: 'Ana'}},
})}));
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({useOnboardingPreferencesStore: (selector: (state: unknown) => unknown) => selector({locale: 'pt-BR'})}));

beforeEach(() => jest.clearAllMocks());

test.each([
  ['Sair do grupo', 'Sair desta equipe?', 'leave'],
  ['Gerar novo código', 'Substituir o convite?', 'renewInvite'],
] as const)('confirms %s with an app dialog before changing the group', async (label, title, action) => {
  const view = await render(<SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
    <AppModalProvider><GroupsScreen /></AppModalProvider>
  </SafeAreaProvider>);
  await fireEvent.press(view.getByRole('button', {name: label}));
  expect(view.getByRole('header', {name: title})).toBeTruthy();
  expect(mockGroups[action]).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Cancelar'}));
  expect(mockGroups[action]).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: label}));
  await fireEvent.press(view.getByRole('button', {name: label}));
  await waitFor(() => expect(view.queryByRole('header', {name: title})).toBeNull());
  expect(mockGroups[action]).toHaveBeenCalledTimes(1);
});
