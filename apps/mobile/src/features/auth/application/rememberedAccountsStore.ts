import type {User} from '@aqualino/contracts';
import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';

const storage = createMMKV({id: 'aqualino.remembered-accounts'});
const accountsKey = 'auth.rememberedAccounts';
const maximumRememberedAccounts = 3;

export interface RememberedAccount {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface RememberedAccountsState {
  accounts: RememberedAccount[];
  remember: (user: User) => void;
  forget: (accountId: string) => void;
}

function readAccounts(): RememberedAccount[] {
  const raw = storage.getString(accountsKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((account): account is RememberedAccount => {
      if (!account || typeof account !== 'object') return false;
      const candidate = account as Partial<RememberedAccount>;
      return typeof candidate.id === 'string'
        && typeof candidate.email === 'string'
        && typeof candidate.displayName === 'string'
        && typeof candidate.username === 'string'
        && (candidate.avatarUrl === null || typeof candidate.avatarUrl === 'string');
    }).slice(0, maximumRememberedAccounts);
  } catch {
    return [];
  }
}

export const useRememberedAccountsStore = create<RememberedAccountsState>(set => ({
  accounts: readAccounts(),
  remember(user) {
    set(state => {
      const account: RememberedAccount = {
        id: user.id,
        email: user.email,
        displayName: user.profile.display_name,
        username: user.profile.username,
        avatarUrl: user.profile.avatar_url,
      };
      const accounts = [
        account,
        ...state.accounts.filter(candidate => candidate.id !== account.id),
      ].slice(0, maximumRememberedAccounts);
      storage.set(accountsKey, JSON.stringify(accounts));
      return {accounts};
    });
  },
  forget(accountId) {
    set(state => {
      const accounts = state.accounts.filter(account => account.id !== accountId);
      storage.set(accountsKey, JSON.stringify(accounts));
      return {accounts};
    });
  },
}));
