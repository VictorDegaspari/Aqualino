import type {AppLocale} from '../../../shared/i18n/appLocale';

const mockValues = new Map<string, unknown>();
let mockDeviceLocale: AppLocale = 'es-ES';
jest.mock('../../../shared/i18n/deviceLocale', () => ({getDeviceLocale: () => mockDeviceLocale}));
jest.mock('react-native-mmkv', () => ({createMMKV: () => ({
  getString: (key: string) => mockValues.get(key), getNumber: (key: string) => mockValues.get(key),
  getBoolean: (key: string) => mockValues.get(key), contains: (key: string) => mockValues.has(key),
  set: (key: string, value: unknown) => mockValues.set(key, value), remove: (key: string) => mockValues.delete(key),
})}));

function openApp() {
  let store!: typeof import('../application/onboardingPreferencesStore').useOnboardingPreferencesStore;
  jest.isolateModules(() => {store = require('../application/onboardingPreferencesStore').useOnboardingPreferencesStore;});
  return store;
}

beforeEach(() => {mockValues.clear(); mockDeviceLocale = 'es-ES';});

test('first launch starts in the phone language without storing an explicit choice', () => {
  expect(openApp().getState().locale).toBe('es-ES');
  expect(mockValues.has('onboarding.locale')).toBe(false);
});

test('a saved choice wins over the phone language after reopening', () => {
  openApp().getState().selectLocale('en-US');
  expect(openApp().getState().locale).toBe('en-US');
  mockDeviceLocale = 'pt-BR';
  expect(openApp().getState().locale).toBe('en-US');
});

test('Spanish stays selected when restarting onboarding or reopening the app', () => {
  mockDeviceLocale = 'pt-BR';
  const store = openApp();
  store.getState().selectLocale('es-ES');
  store.getState().restartWelcome();
  expect(store.getState().locale).toBe('es-ES');
  expect(openApp().getState().locale).toBe('es-ES');
});
