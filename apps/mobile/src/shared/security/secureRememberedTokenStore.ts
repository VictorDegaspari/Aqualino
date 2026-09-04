import * as Keychain from 'react-native-keychain';

const SERVICE_PREFIX = 'br.com.aqualino.mobile.remembered-token';

function serviceFor(accountId: string): string {
  return `${SERVICE_PREFIX}.${accountId}`;
}

export const secureRememberedTokenStore = {
  async get(accountId: string): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({service: serviceFor(accountId)});
    return credentials ? credentials.password : null;
  },

  async set(accountId: string, token: string): Promise<void> {
    await Keychain.setGenericPassword(accountId, token, {
      service: serviceFor(accountId),
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async clear(accountId: string): Promise<void> {
    await Keychain.resetGenericPassword({service: serviceFor(accountId)});
  },
};
