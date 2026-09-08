/* global jest */

jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));
// Keep the simulated phone language deterministic, regardless of the test host.
jest.mock('./src/shared/i18n/deviceLocale', () => ({getDeviceLocale: jest.fn(() => 'pt-BR')}));
jest.mock('react-native-mmkv', () => {
  const stores = new Map();
  return {createMMKV: ({id} = {}) => {
    if (!stores.has(id)) stores.set(id, new Map());
    const values = stores.get(id);
    return {
      getString: key => values.get(key), getNumber: key => values.get(key), getBoolean: key => values.get(key),
      set: (key, value) => values.set(key, value), remove: key => values.delete(key),
      contains: key => values.has(key), clearAll: () => values.clear(), getAllKeys: () => [...values.keys()],
    };
  }};
});
