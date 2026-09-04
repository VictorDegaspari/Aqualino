import notifee, {RepeatFrequency} from '@notifee/react-native';
import {
  cancelReminder,
  nextReminderTimestamp,
  nextReminderTimestampForWeekday,
  scheduleReminder,
} from '../application/reminderNotificationService';
import {ALL_REMINDER_WEEKDAYS} from '../application/reminderWeekdays';

beforeEach(() => {
  jest.clearAllMocks();
});

test('uses the selected time later on the same day', () => {
  const now = new Date(2026, 8, 4, 8, 15, 0);
  const result = new Date(nextReminderTimestamp(12, 30, now));

  expect(result.getFullYear()).toBe(2026);
  expect(result.getMonth()).toBe(8);
  expect(result.getDate()).toBe(4);
  expect(result.getHours()).toBe(12);
  expect(result.getMinutes()).toBe(30);
});

test('moves a reminder to tomorrow when its time has passed', () => {
  const now = new Date(2026, 8, 4, 20, 0, 0);
  const result = new Date(nextReminderTimestamp(8, 30, now));

  expect(result.getDate()).toBe(5);
  expect(result.getHours()).toBe(8);
  expect(result.getMinutes()).toBe(30);
});

test('finds the next selected weekday and moves past times by one week', () => {
  const fridayMorning = new Date(2026, 8, 4, 8, 15, 0);
  const nextMonday = new Date(nextReminderTimestampForWeekday(9, 30, 1, fridayMorning));
  const nextFriday = new Date(nextReminderTimestampForWeekday(7, 30, 5, fridayMorning));

  expect(nextMonday.getDay()).toBe(1);
  expect(nextMonday.getDate()).toBe(7);
  expect(nextMonday.getHours()).toBe(9);
  expect(nextFriday.getDay()).toBe(5);
  expect(nextFriday.getDate()).toBe(11);
});

test('uses one daily native trigger when every weekday is selected', async () => {
  await scheduleReminder('morning', 8, 0, ALL_REMINDER_WEEKDAYS);

  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  expect(notifee.createTriggerNotification).toHaveBeenCalledWith(
    expect.objectContaining({id: 'hydration-reminder-morning'}),
    expect.objectContaining({repeatFrequency: RepeatFrequency.DAILY}),
  );
});

test('uses one weekly native trigger for each selected weekday', async () => {
  await scheduleReminder('workday', 10, 15, [1, 3, 5]);

  expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(3);
  expect(jest.mocked(notifee.createTriggerNotification).mock.calls.map(([notification]) => notification.id)).toEqual([
    'hydration-reminder-workday-weekday-1',
    'hydration-reminder-workday-weekday-3',
    'hydration-reminder-workday-weekday-5',
  ]);
  jest.mocked(notifee.createTriggerNotification).mock.calls.forEach(([, trigger]) => {
    expect(trigger).toEqual(expect.objectContaining({repeatFrequency: RepeatFrequency.WEEKLY}));
  });
});

test('cancels daily, legacy and weekday trigger identifiers', async () => {
  await cancelReminder('morning');

  expect(notifee.cancelNotification).toHaveBeenCalledTimes(8);
  expect(notifee.cancelNotification).toHaveBeenCalledWith('hydration-reminder-morning');
  expect(notifee.cancelNotification).toHaveBeenCalledWith('hydration-reminder-morning-weekday-0');
});
