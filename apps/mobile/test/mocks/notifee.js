/* global jest */

const settings = {
  authorizationStatus: 1,
  android: {alarm: 1},
};

const notifee = {
  cancelNotification: jest.fn(async () => undefined),
  createChannel: jest.fn(async channel => channel.id),
  createTriggerNotification: jest.fn(async notification => notification.id),
  getNotificationSettings: jest.fn(async () => settings),
  onBackgroundEvent: jest.fn(),
  openAlarmPermissionSettings: jest.fn(async () => undefined),
  openNotificationSettings: jest.fn(async () => undefined),
  requestPermission: jest.fn(async () => settings),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AlarmType: {SET_EXACT_AND_ALLOW_WHILE_IDLE: 3},
  AndroidImportance: {DEFAULT: 3},
  AndroidNotificationSetting: {NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1},
  AuthorizationStatus: {NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2},
  RepeatFrequency: {NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2},
  TriggerType: {TIMESTAMP: 0, INTERVAL: 1},
};
