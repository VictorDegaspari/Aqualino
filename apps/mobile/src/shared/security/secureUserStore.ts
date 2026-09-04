import type {User} from '@aqualino/contracts';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'br.com.aqualino.mobile.user';

export const secureUserStore = {
  async hydrate(): Promise<User | null> {
    const credentials = await Keychain.getGenericPassword({service: SERVICE});
    if (!credentials) return null;

    try {
      const user = JSON.parse(credentials.password) as unknown;
      return isUser(user) ? user : null;
    } catch {
      return null;
    }
  },

  async set(user: User): Promise<void> {
    await Keychain.setGenericPassword('mobile-user', JSON.stringify(user), {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({service: SERVICE});
  },
};

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
