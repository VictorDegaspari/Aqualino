import type {User} from '@aqualino/contracts';
import * as Keychain from 'react-native-keychain';
import {secureUserStore} from '../../../shared/security/secureUserStore';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only'},
  STORAGE_TYPE: {AES_GCM: 'KeystoreAESGCM'},
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const keychain = jest.mocked(Keychain);
const user: User = {
  id: 'user-1', email: 'ana@example.com', xp_total: 0, level: 1, streak: 0,
  profile: {
    user_id: 'user-1', display_name: 'Ana', username: 'ana', avatar_url: null,
    timezone: 'America/Sao_Paulo', locale: 'pt-BR', favorite_volumes_ml: [200], onboarding_completed_at: null,
  },
};
let saved: string | null;

beforeEach(() => {
  jest.resetAllMocks();
  saved = null;
  keychain.setGenericPassword.mockImplementation(async (_name, value) => {
    saved = value;
    return {service: 'user', storage: Keychain.STORAGE_TYPE.AES_GCM};
  });
  keychain.getGenericPassword.mockImplementation(async () => saved
    ? {username: 'mobile-user', password: saved, service: 'user', storage: Keychain.STORAGE_TYPE.AES_GCM}
    : false);
  keychain.resetGenericPassword.mockImplementation(async () => {saved = null; return true;});
});

it('restores the latest reward even when saving an older profile is slow', async () => {
  let finish!: () => void;
  const started = new Promise<void>(resolve => {
    keychain.setGenericPassword.mockImplementationOnce(async (_name, value) => {
      resolve();
      await new Promise<void>(done => {finish = done;});
      saved = value;
      return {service: 'user', storage: Keychain.STORAGE_TYPE.AES_GCM};
    });
  });
  const profile = secureUserStore.set(user);
  await started;
  const progress = {...user, xp_total: 550, level: 5, streak: 3};
  const reward = secureUserStore.set(progress);
  finish();
  await Promise.all([profile, reward]);

  expect(await secureUserStore.hydrate()).toEqual(progress);
});

it('finishes an old save before clearing the user on logout', async () => {
  let finish!: () => void;
  const started = new Promise<void>(resolve => {
    keychain.setGenericPassword.mockImplementationOnce(async (_name, value) => {
      resolve();
      await new Promise<void>(done => {finish = done;});
      saved = value;
      return {service: 'user', storage: Keychain.STORAGE_TYPE.AES_GCM};
    });
  });
  const pending = secureUserStore.set(user);
  await started;
  const logout = secureUserStore.clear();
  finish();
  await Promise.all([pending, logout]);

  expect(await secureUserStore.hydrate()).toBeNull();
});

it('can save progress after an earlier keychain write fails', async () => {
  keychain.setGenericPassword.mockRejectedValueOnce(new Error('Keychain unavailable'));
  await expect(secureUserStore.set(user)).rejects.toThrow('Keychain unavailable');
  const progress = {...user, xp_total: 550, level: 5, streak: 3};
  await secureUserStore.set(progress);

  expect(await secureUserStore.hydrate()).toEqual(progress);
});
