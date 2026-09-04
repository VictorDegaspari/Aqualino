import React, {useCallback, useEffect, useState} from 'react';
import {Alert, AppState} from 'react-native';
import {
  currentReminderPermissionIssue,
  openReminderPermissionSettings,
  ReminderPermissionError,
  type ReminderPermissionIssue,
} from '../application/reminderNotificationService';
import {type HydrationReminder, useReminderStore} from '../application/reminderStore';
import {formatReminderWeekdays, type ReminderWeekday} from '../application/reminderWeekdays';
import {RemindersView} from './RemindersView';

export function RemindersScreen(): React.JSX.Element {
  const reminders = useReminderStore(state => state.reminders);
  const addReminder = useReminderStore(state => state.addReminder);
  const toggleReminder = useReminderStore(state => state.toggleReminder);
  const removeReminder = useReminderStore(state => state.removeReminder);
  const [busyId, setBusyId] = useState<string>();
  const [feedback, setFeedback] = useState<{kind: 'success' | 'error'; message: string}>();
  const [permissionIssue, setPermissionIssue] = useState<ReminderPermissionIssue>();

  const refreshPermission = useCallback(() => {
    currentReminderPermissionIssue().then(setPermissionIssue).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshPermission();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const reportError = useCallback((error: unknown) => {
    if (error instanceof ReminderPermissionError) {
      setPermissionIssue(error.issue);
    }
    setFeedback({kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível atualizar o lembrete.'});
  }, []);
  const handleAdd = useCallback(async (
    hour: number,
    minute: number,
    weekdays: readonly ReminderWeekday[],
  ): Promise<boolean> => {
    setBusyId('new');
    setFeedback(undefined);
    try {
      await addReminder(hour, minute, weekdays);
      setPermissionIssue(undefined);
      setFeedback({
        kind: 'success',
        message: `Lembrete marcado para ${formatTime(hour, minute)} · ${formatReminderWeekdays(weekdays)}.`,
      });
      return true;
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      setBusyId(undefined);
    }
  }, [addReminder, reportError]);
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    setBusyId(id);
    setFeedback(undefined);
    try {
      await toggleReminder(id, enabled);
      if (enabled) setPermissionIssue(undefined);
    } catch (error) {
      reportError(error);
    } finally {
      setBusyId(undefined);
    }
  }, [reportError, toggleReminder]);
  const remove = useCallback(async (reminder: HydrationReminder) => {
    setBusyId(reminder.id);
    setFeedback(undefined);
    try {
      await removeReminder(reminder.id);
      setFeedback({kind: 'success', message: `Lembrete das ${formatTime(reminder.hour, reminder.minute)} removido.`});
    } catch (error) {
      reportError(error);
    } finally {
      setBusyId(undefined);
    }
  }, [removeReminder, reportError]);
  const confirmRemove = useCallback((reminder: HydrationReminder) => {
    Alert.alert(
      'Remover lembrete?',
      `O aviso das ${formatTime(reminder.hour, reminder.minute)} (${formatReminderWeekdays(reminder.weekdays)}) será cancelado.`,
      [
        {text: 'Manter', style: 'cancel'},
        {text: 'Remover', style: 'destructive', onPress: () => remove(reminder)},
      ],
    );
  }, [remove]);
  const openSettings = useCallback(() => {
    if (permissionIssue) openReminderPermissionSettings(permissionIssue);
  }, [permissionIssue]);

  return (
    <RemindersView
      reminders={reminders}
      busyId={busyId}
      feedback={feedback}
      permissionIssue={permissionIssue}
      onAdd={handleAdd}
      onToggle={handleToggle}
      onRemove={confirmRemove}
      onOpenSettings={openSettings}
    />
  );
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
