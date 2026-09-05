import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {PrivateGroup} from '@aqualino/contracts';
import {GroupsView} from '../presentation/GroupsView';
import {AppModalProvider} from '../../../shared/components/AppModal';

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

const group: PrivateGroup = {
  id: 'group-1', name: 'Maré de amigos', timezone: 'America/Sao_Paulo', owner_id: 'ana', max_members: 5,
  members: [{user_id: 'ana', display_name: 'Ana', avatar_url: 'avatar_2', role: 'owner'}],
  invite: {code: 'ABC123DEF456', expires_at: '2099-09-12T00:00:00Z'},
};

function props(overrides: Partial<React.ComponentProps<typeof GroupsView>> = {}) {
  return {
    displayName: 'Ana', userId: 'ana', avatarId: 'avatar_2',
    onRefresh: jest.fn(), onClearError: jest.fn(), onCreateGroup: jest.fn().mockResolvedValue(true),
    onPreviewInvite: jest.fn().mockResolvedValue({name: 'Maré de amigos', member_count: 2, max_members: 5, timezone: 'America/Sao_Paulo', expires_at: '2099-01-01T00:00:00Z'}),
    onJoinGroup: jest.fn().mockResolvedValue(true), onShare: jest.fn(), onRenewInvite: jest.fn(), onLeave: jest.fn(),
    ...overrides,
  };
}

function renderGroups(options = props()) {
  return render(<SafeAreaProvider initialMetrics={safeAreaMetrics}><AppModalProvider><GroupsView {...options} /></AppModalProvider></SafeAreaProvider>);
}

test('presents the empty group state and the signed-in member', async () => {
  const view = await renderGroups();
  expect(view.getByText('NENHUM GRUPO ATIVO')).toBeTruthy();
  expect(view.getByText('Ana')).toBeTruthy();
  expect(view.getByLabelText('Ana e quatro vagas disponíveis')).toBeTruthy();
});

test('validates the name and creates a group with trimmed input', async () => {
  const options = props();
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Criar grupo'}));
  expect(view.getByRole('button', {name: 'Criar grupo'})).toBeDisabled();
  await fireEvent.changeText(view.getByLabelText('Nome do grupo'), '  Maré de amigos  ');
  await fireEvent.press(view.getByRole('button', {name: 'Criar grupo'}));
  expect(options.onCreateGroup).toHaveBeenCalledWith('Maré de amigos');
  expect(view.queryByLabelText('Nome do grupo')).toBeNull();
});

test('previews an invitation before explicitly joining', async () => {
  const options = props();
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com código'}));
  expect(view.getByRole('button', {name: 'Conferir convite'})).toBeDisabled();
  await fireEvent.changeText(view.getByLabelText('Código de convite'), ' abc123def456 ');
  await fireEvent.press(view.getByRole('button', {name: 'Conferir convite'}));
  expect(options.onPreviewInvite).toHaveBeenCalledWith('ABC123DEF456');
  expect(options.onJoinGroup).not.toHaveBeenCalled();
  expect(view.getByText('Maré de amigos')).toBeTruthy();
  expect(view.getByText('2 de 5 integrantes')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Aceitar e entrar'}));
  expect(options.onJoinGroup).toHaveBeenCalledWith('ABC123DEF456');
});

test('does not accept a full team and allows changing the code', async () => {
  const options = props({onPreviewInvite: jest.fn().mockResolvedValue({name: 'Equipe cheia', member_count: 5, max_members: 5, timezone: 'UTC'})});
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com código'}));
  await fireEvent.changeText(view.getByLabelText('Código de convite'), 'ABC123DEF456');
  await fireEvent.press(view.getByRole('button', {name: 'Conferir convite'}));
  expect(view.getByRole('button', {name: 'Aceitar e entrar'})).toBeDisabled();
  await fireEvent.press(view.getByRole('button', {name: 'Usar outro código'}));
  expect(view.getByLabelText('Código de convite')).toHaveDisplayValue('ABC123DEF456');
  expect(options.onJoinGroup).not.toHaveBeenCalled();
});

test('keeps entered data when creation fails', async () => {
  const options = props({onCreateGroup: jest.fn().mockResolvedValue(false)});
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Criar grupo'}));
  await fireEvent.changeText(view.getByLabelText('Nome do grupo'), 'Maré de amigos');
  await fireEvent.press(view.getByRole('button', {name: 'Criar grupo'}));
  expect(view.getByLabelText('Nome do grupo')).toHaveDisplayValue('Maré de amigos');
});

test('shows loading without falsely presenting an empty team', async () => {
  const view = await renderGroups(props({loading: true}));
  expect(view.getByText('Buscando sua equipe…')).toBeTruthy();
  expect(view.queryByText('NENHUM GRUPO ATIVO')).toBeNull();
  expect(view.queryByRole('button', {name: 'Criar grupo'})).toBeNull();
});

test('offers retry on connection failure without an empty-state flash', async () => {
  const options = props({loadError: 'Sem conexão'});
  const view = await renderGroups(options);
  expect(view.getByRole('alert')).toHaveTextContent('Sem conexão');
  expect(view.queryByText('NENHUM GRUPO ATIVO')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Tentar novamente'}));
  expect(options.onRefresh).toHaveBeenCalledTimes(1);
});

test('shows real members, available spots and owner invitation actions', async () => {
  const options = props({group});
  const view = await renderGroups(options);
  expect(view.getByText('Maré de amigos')).toBeTruthy();
  expect(view.getByText('Ana · Você')).toBeTruthy();
  expect(view.getByText('Responsável')).toBeTruthy();
  expect(view.getAllByText('Vaga')).toHaveLength(4);
  await fireEvent.press(view.getByRole('button', {name: 'Compartilhar convite'}));
  await fireEvent.press(view.getByRole('button', {name: 'Gerar novo código'}));
  await fireEvent.press(view.getByRole('button', {name: 'Sair do grupo'}));
  expect(options.onShare).toHaveBeenCalledTimes(1);
  expect(options.onRenewInvite).toHaveBeenCalledTimes(1);
  expect(options.onLeave).toHaveBeenCalledTimes(1);
});

test('hides invitation management from members and supports the selected language', async () => {
  const view = await renderGroups(props({group: {...group, invite: null}, userId: 'bruno', locale: 'en-US'}));
  expect(view.getByText('Members')).toBeTruthy();
  expect(view.getByText('Ask the owner to invite more people.')).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Share invitation'})).toBeNull();
  expect(view.queryByText(group.invite!.code)).toBeNull();
});

test('disables sharing an expired invitation', async () => {
  const view = await renderGroups(props({group: {...group, invite: {...group.invite!, expires_at: '2000-01-01T00:00:00Z'}}}));
  expect(view.getByRole('button', {name: 'Compartilhar convite'})).toBeDisabled();
  expect(view.getByRole('button', {name: 'Gerar novo código'})).toBeEnabled();
});
