import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {RemindersScreen} from '../presentation/RemindersScreen';

const mockRemove = jest.fn().mockResolvedValue(undefined);
jest.mock('../application/reminderStore', () => ({useReminderStore: (selector: (state: unknown) => unknown) => selector({
  reminders: [{id: 'morning', hour: 8, minute: 30, weekdays: [1, 3, 5], enabled: true}],
  addReminder: jest.fn(), toggleReminder: jest.fn(), removeReminder: mockRemove,
})}));
jest.mock('../application/reminderNotificationService', () => ({
  currentReminderPermissionIssue: async () => undefined,
  openReminderPermissionSettings: jest.fn(), ReminderPermissionError: class extends Error {},
}));

test('removes a reminder only after confirming in the app dialog', async () => {
  const view = await render(<SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
    <AppModalProvider><RemindersScreen /></AppModalProvider>
  </SafeAreaProvider>);
  await fireEvent.press(view.getByRole('button', {name: 'Remover lembrete das 08:30'}));
  expect(view.getByText(/O aviso das 08:30/)).toBeTruthy();
  expect(mockRemove).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Manter'}));
  expect(mockRemove).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Remover lembrete das 08:30'}));
  await fireEvent.press(view.getByRole('button', {name: 'Remover'}));
  await waitFor(() => expect(view.queryByRole('header', {name: 'Remover lembrete?'})).toBeNull());
  expect(mockRemove).toHaveBeenCalledWith('morning');
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
