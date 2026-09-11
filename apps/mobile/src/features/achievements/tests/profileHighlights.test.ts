import type {AchievementCode} from '@aqualino/contracts';
import {emptyAchievementCollection, profileAchievements} from '../application/achievementCatalog';

const mockValues = new Map<string, string>();
let mockStorageFails = false;
jest.mock('react-native-mmkv', () => ({createMMKV: () => ({
  getString: (key: string) => mockValues.get(key),
  set: (key: string, value: string) => {
    if (mockStorageFails) throw new Error('Storage unavailable');
    mockValues.set(key, value);
  },
})}));

function loadStore() {
  let store!: typeof import('../application/achievementLocalStore').useAchievementLocalStore;
  jest.isolateModules(() => {store = require('../application/achievementLocalStore').useAchievementLocalStore;});
  return store;
}

beforeEach(() => {mockValues.clear(); mockStorageFails = false;});

test('persists choices by account across reloads, including an explicitly empty collection', () => {
  const store = loadStore();
  expect(store.getState().saveProfileHighlights('ana', ['team_player', 'first_drop'])).toBe(true);
  expect(store.getState().saveProfileHighlights('bruno', [])).toBe(true);
  store.getState().dismiss('ana', 'first_drop');
  const restored = loadStore().getState();
  expect(restored.profileHighlights).toEqual({ana: ['team_player', 'first_drop'], bruno: []});
  expect(restored.profileHighlights.carla).toBeUndefined();
  expect(restored.seen.ana).toEqual(['first_drop']);
  const items = emptyAchievementCollection.items.map(item => ({...item, unlocked_at: '2026-09-04T12:00:00Z'}));
  expect(profileAchievements(items, restored.profileHighlights.ana).map(item => item.code)).toEqual(['team_player', 'first_drop']);
  expect(profileAchievements(items, restored.profileHighlights.bruno)).toEqual([]);
});

test('rejects more than four or unknown codes and leaves saved choices intact on storage failure', () => {
  const store = loadStore();
  store.getState().saveProfileHighlights('ana', ['first_drop', 'first_drop']);
  expect(store.getState().profileHighlights.ana).toEqual(['first_drop']);
  expect(store.getState().saveProfileHighlights('ana', emptyAchievementCollection.items.slice(0, 5).map(item => item.code))).toBe(false);
  expect(store.getState().saveProfileHighlights('ana', ['invalid' as AchievementCode])).toBe(false);
  mockStorageFails = true;
  expect(store.getState().saveProfileHighlights('ana', [])).toBe(false);
  expect(store.getState().profileHighlights.ana).toEqual(['first_drop']);
  expect(loadStore().getState().profileHighlights.ana).toEqual(['first_drop']);
});

test('reads older storage and sanitizes stale or duplicated profile codes', () => {
  mockValues.set('local.v1', JSON.stringify({seen: {ana: ['first_drop']}}));
  expect(loadStore().getState().profileHighlights).toEqual({});
  mockValues.set('local.v1', JSON.stringify({profileHighlights: {ana: ['invalid', 'first_drop', 'first_drop', 'team_player'], bruno: 'invalid'}}));
  expect(loadStore().getState().profileHighlights).toEqual({ana: ['first_drop', 'team_player']});
  expect(profileAchievements(emptyAchievementCollection.items, ['first_drop'])).toEqual([]);
});
