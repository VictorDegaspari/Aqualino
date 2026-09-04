import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationReminder} from '../application/reminderStore';
import {ALL_REMINDER_WEEKDAYS} from '../application/reminderWeekdays';
import {RemindersView} from '../presentation/RemindersView';

const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

const baseProps = {
  reminders: [],
  onAdd: jest.fn(async () => true),
  onToggle: jest.fn(),
  onRemove: jest.fn(),
  onOpenSettings: jest.fn(),
};

function renderReminders(view: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={safeAreaMetrics}>{view}</SafeAreaProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('creates a reminder for every day from a suggested time', async () => {
  const onAdd = jest.fn(async () => true);
  const view = await renderReminders(<RemindersView {...baseProps} onAdd={onAdd} />);

  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Criar lembrete'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: '16:00'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Salvar lembrete'})));

  await waitFor(() => expect(onAdd).toHaveBeenCalledWith(16, 0, ALL_REMINDER_WEEKDAYS));
});

test('creates a reminder only for the selected weekdays', async () => {
  const onAdd = jest.fn(async () => true);
  const view = await renderReminders(<RemindersView {...baseProps} onAdd={onAdd} />);

  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Criar lembrete'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Limpar seleção de dias'})));
  await act(async () => fireEvent.press(view.getByRole('checkbox', {name: 'Segunda-feira'})));
  await act(async () => fireEvent.press(view.getByRole('checkbox', {name: 'Quarta-feira'})));
  await act(async () => fireEvent.press(view.getByRole('checkbox', {name: 'Sexta-feira'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Salvar lembrete'})));

  await waitFor(() => expect(onAdd).toHaveBeenCalledWith(8, 0, [1, 3, 5]));
});

test('requires at least one selected weekday', async () => {
  const onAdd = jest.fn(async () => true);
  const view = await renderReminders(<RemindersView {...baseProps} onAdd={onAdd} />);

  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Criar lembrete'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Limpar seleção de dias'})));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Salvar lembrete'})));

  expect(view.getByRole('alert')).toHaveTextContent('Selecione pelo menos um dia da semana.');
  expect(onAdd).not.toHaveBeenCalled();
});

test('validates an invalid time before saving', async () => {
  const onAdd = jest.fn(async () => true);
  const view = await renderReminders(<RemindersView {...baseProps} onAdd={onAdd} />);

  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Criar lembrete'})));
  await act(async () => fireEvent.changeText(view.getByLabelText('Hora do lembrete'), '29'));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Salvar lembrete'})));

  expect(view.getByRole('alert')).toHaveTextContent('Informe uma hora entre 00 e 23.');
  expect(onAdd).not.toHaveBeenCalled();
});

test('toggles and removes an existing reminder', async () => {
  const onToggle = jest.fn();
  const onRemove = jest.fn();
  const reminder: HydrationReminder = {id: 'morning', hour: 8, minute: 30, weekdays: [1, 3, 5], enabled: true};
  const view = await renderReminders(
    <RemindersView {...baseProps} reminders={[reminder]} onToggle={onToggle} onRemove={onRemove} />,
  );

  await act(async () => fireEvent(view.getByLabelText('Lembrete das 08:30'), 'valueChange', false));
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Remover lembrete das 08:30'})));

  expect(onToggle).toHaveBeenCalledWith('morning', false);
  expect(onRemove).toHaveBeenCalledWith(reminder);
  expect(view.getByText('Seg, Qua e Sex')).toBeTruthy();
});

test('offers system settings when notification permission is blocked', async () => {
  const onOpenSettings = jest.fn();
  const view = await renderReminders(
    <RemindersView {...baseProps} permissionIssue="notifications" onOpenSettings={onOpenSettings} />,
  );

  expect(view.getByText('Notificações desativadas')).toBeTruthy();
  await act(async () => fireEvent.press(view.getByRole('button', {name: 'Abrir ajustes'})));
  expect(onOpenSettings).toHaveBeenCalledTimes(1);
});
