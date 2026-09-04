import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GroupsView} from '../presentation/GroupsView';

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

function renderGroups(view: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={safeAreaMetrics}>{view}</SafeAreaProvider>);
}

test('presents the empty group state and the signed-in member', async () => {
  const view = await renderGroups(
    <GroupsView displayName="Ana" avatarId="avatar_2" onCreateGroup={jest.fn()} onJoinGroup={jest.fn()} />,
  );

  expect(view.getByText('NENHUM GRUPO ATIVO')).toBeTruthy();
  expect(view.getByText('Ana')).toBeTruthy();
  expect(view.getByLabelText('Ana e quatro vagas disponíveis')).toBeTruthy();
});

test('exposes create and join actions', async () => {
  const onCreateGroup = jest.fn();
  const onJoinGroup = jest.fn();
  const view = await renderGroups(
    <GroupsView displayName="Ana" onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />,
  );

  await fireEvent.press(view.getByRole('button', {name: 'Criar grupo'}));
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com código'}));

  expect(onCreateGroup).toHaveBeenCalledTimes(1);
  expect(onJoinGroup).toHaveBeenCalledTimes(1);
});
