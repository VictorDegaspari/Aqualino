import {defaultHomeThemeId, getHomeTheme} from '../domain/homeThemes';

const mockValues = new Map<string, string>();
const mockWrite = jest.fn((key: string, value: string) => {mockValues.set(key, value);});
jest.mock('react-native-mmkv', () => ({createMMKV: () => ({getString: (key: string) => mockValues.get(key), set: mockWrite})}));

function loadStore() {
  let store!: typeof import('../application/homePreferencesStore').useHomePreferencesStore;
  jest.isolateModules(() => {store = require('../application/homePreferencesStore').useHomePreferencesStore;});
  return store;
}

beforeEach(() => {
  mockValues.clear();
  mockWrite.mockClear();
});

test('restores the saved themes after restarting and keeps accounts independent', () => {
  const store = loadStore();
  store.getState().selectTheme('ana', 'open-ocean');
  store.getState().selectTheme('bia', 'coral-reef');

  const reopened = loadStore();
  expect(reopened.getState().themesByUser).toEqual({ana: 'open-ocean', bia: 'coral-reef'});
  expect(getHomeTheme(reopened.getState().themesByUser.newUser).id).toBe(defaultHomeThemeId);
});

test.each(['broken json', 'null', '[]', '17'])('uses the default when saved data is invalid: %s', value => {
  mockValues.set('themes.v1', value);
  const store = loadStore();
  expect(getHomeTheme(store.getState().themesByUser.ana).id).toBe(defaultHomeThemeId);
  store.getState().selectTheme('ana', 'open-ocean');
  expect(loadStore().getState().themesByUser.ana).toBe('open-ocean');
});

test('ignores unknown themes without dropping another account valid preference', () => {
  mockValues.set('themes.v1', JSON.stringify({ana: 'retired-theme', bia: 'open-ocean', cai: true}));
  const store = loadStore();
  expect(store.getState().themesByUser).toEqual({bia: 'open-ocean'});
  expect(getHomeTheme('retired-theme').id).toBe(defaultHomeThemeId);
});

test('preserves the applied theme when persistence fails and saves on retry', () => {
  const store = loadStore();
  store.getState().selectTheme('ana', 'coral-reef');
  mockWrite.mockImplementationOnce(() => {throw new Error('Storage unavailable');});
  expect(() => store.getState().selectTheme('ana', 'open-ocean')).toThrow('Storage unavailable');
  expect(store.getState().themesByUser.ana).toBe('coral-reef');
  expect(loadStore().getState().themesByUser.ana).toBe('coral-reef');

  store.getState().selectTheme('ana', 'open-ocean');
  expect(loadStore().getState().themesByUser.ana).toBe('open-ocean');
});
