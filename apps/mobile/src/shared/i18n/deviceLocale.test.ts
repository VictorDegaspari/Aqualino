import {NativeModules, Platform} from 'react-native';
import {getDeviceLocale} from './deviceLocale';

jest.unmock('./deviceLocale');

const originalOS = Platform.OS;
const originalSettings = NativeModules.SettingsManager;
const originalI18n = NativeModules.I18nManager;

afterEach(() => {
  Platform.OS = originalOS;
  NativeModules.SettingsManager = originalSettings;
  NativeModules.I18nManager = originalI18n;
  jest.restoreAllMocks();
});

test('uses the Android phone language including regional variants', () => {
  Platform.OS = 'android';
  NativeModules.I18nManager = {localeIdentifier: 'es_MX'};
  expect(getDeviceLocale()).toBe('es-ES');
});

test('uses the first preferred iPhone language', () => {
  Platform.OS = 'ios';
  NativeModules.SettingsManager = {settings: {AppleLanguages: ['es-AR', 'en-US'], AppleLocale: 'en_US'}};
  expect(getDeviceLocale()).toBe('es-ES');
});

test('falls back to the system Intl locale when native settings are unavailable', () => {
  NativeModules.SettingsManager = undefined;
  NativeModules.I18nManager = undefined;
  jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({locale: 'en-GB'} as Intl.ResolvedDateTimeFormatOptions);
  expect(getDeviceLocale()).toBe('en-US');
});

test('uses Portuguese for an unsupported phone language', () => {
  Platform.OS = 'android';
  NativeModules.I18nManager = {localeIdentifier: 'fr_FR'};
  expect(getDeviceLocale()).toBe('pt-BR');
});

test('still opens when the system locale cannot be read', () => {
  NativeModules.SettingsManager = undefined;
  NativeModules.I18nManager = undefined;
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {throw new Error('Unavailable');});
  expect(getDeviceLocale()).toBe('pt-BR');
});
