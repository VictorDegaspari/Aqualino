import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {GroupInvitePreview, PrivateGroup} from '@aqualino/contracts';
import {GroupsView} from '../presentation/GroupsView';
import {AppModalProvider} from '../../../shared/components/AppModal';

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

const group: PrivateGroup = {
  id: 'group-1', name: 'Maré de amigos', timezone: 'America/Sao_Paulo', owner_id: 'ana', max_members: 5,
  members: [{user_id: 'ana', display_name: 'Ana', avatar_url: 'avatar_2', role: 'owner', level: 50}],
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

test('shows the level of another group participant', async () => {
  const view = await renderGroups(props({group, userId: 'guest'}));
  expect(view.getByLabelText('Nível 50')).toBeTruthy();
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

test('uses the final keyboard text and blocks duplicate invite submissions', async () => {
  let finish!: (preview: GroupInvitePreview) => void;
  const options = props({onPreviewInvite: jest.fn(() => new Promise<GroupInvitePreview>(resolve => {finish = resolve;}))});
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com código'}));
  await fireEvent.changeText(view.getByTestId('group-code'), 'abc123def45');
  expect(view.getByRole('button', {name: 'Conferir convite'})).toBeDisabled();
  const input = view.getByTestId('group-code');
  await act(() => {
    input.props.onSubmitEditing({nativeEvent: {text: 'abc123def456'}});
    input.props.onSubmitEditing({nativeEvent: {text: 'abc123def456'}});
  });
  expect(options.onPreviewInvite).toHaveBeenCalledTimes(1);
  expect(options.onPreviewInvite).toHaveBeenCalledWith('ABC123DEF456');
  expect(view.getByRole('button', {name: 'Conferir convite'})).toBeDisabled();
  expect(view.getByRole('button', {name: 'Cancelar'})).toBeDisabled();
  expect(options.onJoinGroup).not.toHaveBeenCalled();
  await act(() => finish({name: 'Maré de amigos', member_count: 2, max_members: 5, timezone: 'UTC', expires_at: '2099-01-01T00:00:00Z'}));
  await fireEvent.press(view.getByRole('button', {name: 'Aceitar e entrar'}));
  expect(options.onJoinGroup).toHaveBeenCalledWith('ABC123DEF456');
});

test('allows correcting a rapidly entered code after a failed preview', async () => {
  const options = props({onPreviewInvite: jest.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(null)});
  const view = await renderGroups(options);
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com código'}));
  for (const value of ['abc', 'abc123', 'abc123def456', 'abc123def45', 'abc123def459']) {
    await fireEvent.changeText(view.getByTestId('group-code'), value);
  }
  await fireEvent.press(view.getByRole('button', {name: 'Conferir convite'}));
  expect(options.onPreviewInvite).toHaveBeenLastCalledWith('ABC123DEF459');
  expect(view.getByRole('alert')).toHaveTextContent('Não foi possível concluir. Tente novamente.');
  await fireEvent.changeText(view.getByTestId('group-code'), 'abc123def456');
  expect(view.queryByRole('alert')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Conferir convite'}));
  expect(options.onPreviewInvite).toHaveBeenLastCalledWith('ABC123DEF456');
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
  expect(view.getByText('4 vagas disponíveis')).toBeTruthy();
  expect(view.queryByText(group.invite!.code)).toBeNull();
  await fireEvent.press(view.getByTestId('group-invite'));
  expect(view.getByTestId('group-invite-panel')).toBeTruthy();
  expect(view.queryByTestId('group-settings-panel')).toBeNull();
  expect(view.queryByText('Reinício automático')).toBeNull();
  expect(view.queryByText('Votação das marcações')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Compartilhar convite'}));
  expect(view.queryByTestId('group-invite-panel')).toBeNull();
  await fireEvent.press(view.getByTestId('group-invite'));
  await fireEvent.press(view.getByRole('button', {name: 'Gerar novo código'}));
  expect(view.queryByTestId('group-invite-panel')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Sair do grupo'}));
  expect(options.onShare).toHaveBeenCalledTimes(1);
  expect(options.onRenewInvite).toHaveBeenCalledTimes(1);
  expect(options.onLeave).toHaveBeenCalledTimes(1);
});

test('hides invitation management from members and supports the selected language', async () => {
  const view = await renderGroups(props({group: {...group, invite: null}, userId: 'bruno', locale: 'en-US'}));
  expect(view.getByText('Members')).toBeTruthy();
  await fireEvent.press(view.getByTestId('group-invite'));
  expect(view.getByText('Ask the owner to invite more people.')).toBeTruthy();
  expect(view.queryByRole('button', {name: 'Share invitation'})).toBeNull();
  expect(view.queryByText(group.invite!.code)).toBeNull();
});

test('disables sharing an expired invitation', async () => {
  const view = await renderGroups(props({group: {...group, invite: {...group.invite!, expires_at: '2000-01-01T00:00:00Z'}}}));
  await fireEvent.press(view.getByTestId('group-invite'));
  expect(view.getByRole('button', {name: 'Compartilhar convite'})).toBeDisabled();
  expect(view.getByRole('button', {name: 'Gerar novo código'})).toBeEnabled();
});


test('lets only the leader change photo voting and disables the switch while saving', async () => {
  const onPhotoReviewChange = jest.fn().mockResolvedValue(true);
  const view = await renderGroups(props({group, onPhotoReviewChange}));
  expect(view.queryByTestId('group-photo-review-toggle')).toBeNull();
  await fireEvent.press(view.getByTestId('group-settings'));
  await fireEvent.press(view.getByTestId('group-photo-review-toggle'));
  expect(onPhotoReviewChange).toHaveBeenCalledWith(false);
  await view.unmount();
  const member = await renderGroups(props({group, userId: 'guest', onPhotoReviewChange}));
  await fireEvent.press(member.getByTestId('group-settings'));
  expect(member.queryByTestId('group-photo-review-toggle')).toBeNull();
  await member.unmount();
  const saving = await renderGroups(props({group, busy: true, onPhotoReviewChange}));
  await fireEvent.press(saving.getByTestId('group-settings'));
  expect(saving.getByRole('switch', {name: 'Votação das marcações'})).toBeDisabled();
});


test('hides invitation actions after the group rounds have started', async () => {
  const view = await renderGroups(props({group: {...group, joining_closed: true}}));
  expect(view.queryByTestId('group-invite')).toBeNull();
  expect(view.queryByText('4 vagas disponíveis')).toBeNull();
  await fireEvent.press(view.getByTestId('group-settings'));
  expect(view.queryByText(group.invite!.code)).toBeNull();
  expect(view.queryByRole('button', {name: 'Compartilhar convite'})).toBeNull();
  expect(view.queryByRole('button', {name: 'Gerar novo código'})).toBeNull();
});


test('groups automatic restart and photo voting in settings and reports a failed save', async () => {
  const onAutoRestartChange = jest.fn().mockResolvedValue(false);
  const view = await renderGroups(props({group, onAutoRestartChange, onPhotoReviewChange: jest.fn()}));
  expect(view.queryByText('Reinício automático')).toBeNull();
  await fireEvent.press(view.getByTestId('group-settings'));
  expect(view.queryByTestId('group-invite-panel')).toBeNull();
  expect(view.queryByText(group.invite!.code)).toBeNull();
  expect(view.queryByRole('button', {name: 'Compartilhar convite'})).toBeNull();
  expect(view.queryByRole('button', {name: 'Sair do grupo'})).toBeNull();
  expect(view.getByRole('switch', {name: 'Votação das marcações'})).toBeTruthy();
  expect(view.getByRole('switch', {name: 'Reinício automático'}).props.accessibilityState.checked).toBe(false);
  await fireEvent.press(view.getByTestId('group-auto-restart-toggle'));
  expect(onAutoRestartChange).toHaveBeenCalledWith(true);
  expect(view.getByRole('alert')).toHaveTextContent('Não foi possível salvar. Tente novamente.');
  expect(view.getByRole('switch', {name: 'Reinício automático'}).props.accessibilityState.checked).toBe(false);
  await fireEvent.press(view.getByTestId('group-settings-close'));
  expect(view.queryByTestId('group-settings-panel')).toBeNull();
});
