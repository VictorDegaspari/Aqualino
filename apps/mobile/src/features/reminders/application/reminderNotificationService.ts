import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import {
  ALL_REMINDER_WEEKDAYS,
  normalizeReminderWeekdays,
  type ReminderWeekday,
} from './reminderWeekdays';

const REMINDERS_CHANNEL_ID = 'hydration-reminders';
const NOTIFICATION_ID_PREFIX = 'hydration-reminder-';

export type ReminderPermissionIssue = 'notifications' | 'exact-alarm';

export class ReminderPermissionError extends Error {
  constructor(readonly issue: ReminderPermissionIssue) {
    super(issue === 'notifications'
      ? 'Autorize as notificações para ativar lembretes.'
      : 'Autorize alarmes e lembretes para usar horários exatos.');
    this.name = 'ReminderPermissionError';
  }
}

export async function scheduleReminder(
  id: string,
  hour: number,
  minute: number,
  selectedWeekdays: readonly ReminderWeekday[],
): Promise<void> {
  const weekdays = normalizeReminderWeekdays(selectedWeekdays);
  if (weekdays.length === 0) {
    throw new Error('Selecione pelo menos um dia da semana.');
  }

  await requireReminderPermissions();

  const channelId = await notifee.createChannel({
    id: REMINDERS_CHANNEL_ID,
    name: 'Lembretes de hidratação',
    description: 'Avisos nos horários escolhidos para beber água.',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });
  const schedules = weekdays.length === ALL_REMINDER_WEEKDAYS.length
    ? [{notificationId: notificationId(id), timestamp: nextReminderTimestamp(hour, minute), repeatFrequency: RepeatFrequency.DAILY}]
    : weekdays.map(weekday => ({
      notificationId: notificationId(id, weekday),
      timestamp: nextReminderTimestampForWeekday(hour, minute, weekday),
      repeatFrequency: RepeatFrequency.WEEKLY,
    }));

  try {
    await Promise.all(schedules.map(schedule => {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: schedule.timestamp,
        repeatFrequency: schedule.repeatFrequency,
        ...(Platform.OS === 'android'
          ? {alarmManager: {type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE}}
          : {}),
      };

      return notifee.createTriggerNotification(
        {
          id: schedule.notificationId,
          title: 'Hora de beber água 💧',
          body: 'Uma pausa rápida para cuidar da sua hidratação.',
          android: {
            channelId,
            pressAction: {id: 'default'},
            smallIcon: 'ic_notification_aqualino',
            largeIcon: 'aqualino_happy_active',
            color: '#69ADBA',
          },
          ios: {
            sound: 'default',
            foregroundPresentationOptions: {banner: true, list: true, sound: true, badge: false},
          },
        },
        trigger,
      );
    }));
  } catch (error) {
    await cancelReminder(id).catch(() => undefined);
    throw error;
  }
}

export async function cancelReminder(id: string): Promise<void> {
  const notificationIds = [
    notificationId(id),
    ...ALL_REMINDER_WEEKDAYS.map(weekday => notificationId(id, weekday)),
  ];
  await Promise.all(notificationIds.map(currentId => notifee.cancelNotification(currentId)));
}

export async function currentReminderPermissionIssue(): Promise<ReminderPermissionIssue | undefined> {
  const settings = await notifee.getNotificationSettings();

  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return 'notifications';
  }

  if (
    Platform.OS === 'android'
    && settings.authorizationStatus === AuthorizationStatus.AUTHORIZED
    && settings.android.alarm === AndroidNotificationSetting.DISABLED
  ) {
    return 'exact-alarm';
  }

  return undefined;
}

export async function openReminderPermissionSettings(issue: ReminderPermissionIssue): Promise<void> {
  if (issue === 'exact-alarm' && Platform.OS === 'android') {
    await notifee.openAlarmPermissionSettings();
    return;
  }

  await notifee.openNotificationSettings();
}

export function nextReminderTimestamp(hour: number, minute: number, now = new Date()): number {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}

export function nextReminderTimestampForWeekday(
  hour: number,
  minute: number,
  weekday: ReminderWeekday,
  now = new Date(),
): number {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  next.setDate(next.getDate() + (weekday - now.getDay() + 7) % 7);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }

  return next.getTime();
}

async function requireReminderPermissions(): Promise<void> {
  const settings = await notifee.requestPermission({alert: true, sound: true, badge: false});

  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    throw new ReminderPermissionError('notifications');
  }

  if (Platform.OS === 'android') {
    const currentSettings = await notifee.getNotificationSettings();
    if (currentSettings.android.alarm === AndroidNotificationSetting.DISABLED) {
      throw new ReminderPermissionError('exact-alarm');
    }
  }
}

function notificationId(id: string, weekday?: ReminderWeekday): string {
  const baseId = `${NOTIFICATION_ID_PREFIX}${id}`;
  return weekday === undefined ? baseId : `${baseId}-weekday-${weekday}`;
}
