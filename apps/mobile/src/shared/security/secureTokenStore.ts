import * as Keychain from 'react-native-keychain';

const SERVICE = 'br.com.aqualino.mobile.auth';
let cachedToken: string | null = null;

export const secureTokenStore = {
  async hydrate(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({service: SERVICE});
    cachedToken = credentials ? credentials.password : null;
    return cachedToken;
  },

  getCached(): string | null {
    return cachedToken;
  },

  async set(token: string): Promise<void> {
    await Keychain.setGenericPassword('mobile-token', token, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    cachedToken = token;
  },

  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({service: SERVICE});
    cachedToken = null;
  },
};

