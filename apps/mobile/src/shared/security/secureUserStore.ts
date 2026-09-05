import type {User} from '@aqualino/contracts';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'br.com.aqualino.mobile.user';
let storageOperation: Promise<unknown> = Promise.resolve();

export const secureUserStore = {
  async hydrate(): Promise<User | null> {
    const credentials = await inStorageOrder(() => Keychain.getGenericPassword({service: SERVICE}));
    if (!credentials) return null;

    try {
      const user = JSON.parse(credentials.password) as unknown;
      return isUser(user) ? user : null;
    } catch {
      return null;
    }
  },

  async set(user: User): Promise<void> {
    const value = JSON.stringify(user);
    await inStorageOrder(() => Keychain.setGenericPassword('mobile-user', value, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }));
  },

  async clear(): Promise<void> {
    await inStorageOrder(() => Keychain.resetGenericPassword({service: SERVICE}));
  },
};

function inStorageOrder<T>(operation: () => Promise<T>): Promise<T> {
  // Profile refreshes, water rewards and logout must reach the keychain in order.
  const next = storageOperation.then(operation);
  storageOperation = next.catch(() => undefined);
  return next;
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;

  const user = value as Partial<User>;
  const profile = user.profile as Partial<User['profile']> | undefined;
  return typeof user.id === 'string'
    && typeof user.email === 'string'
    && Boolean(profile)
    && typeof profile?.user_id === 'string'
    && typeof profile.display_name === 'string'
    && typeof profile.username === 'string'
    && typeof profile.timezone === 'string'
    && Array.isArray(profile.favorite_volumes_ml);
}
