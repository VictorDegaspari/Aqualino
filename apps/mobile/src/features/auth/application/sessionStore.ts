import type {User} from '@aqualino/contracts';
import {create} from 'zustand';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {authRepository, type AuthResult} from '../data/authRepository';

type SessionStatus = 'booting' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  user: User | null;
  bootstrap: () => Promise<void>;
  authenticate: (result: AuthResult) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  user: null,
  async bootstrap() {
    const token = await secureTokenStore.hydrate();
    if (!token) {
      set({status: 'signedOut', user: null});
      return;
    }
    try {
      set({status: 'signedIn', user: await authRepository.me()});
    } catch {
      await secureTokenStore.clear();
      set({status: 'signedOut', user: null});
    }
  },
  async authenticate(result) {
    await secureTokenStore.set(result.token);
    set({status: 'signedIn', user: result.user});
  },
  async refreshUser() {
    if (get().status === 'signedIn') {
      set({user: await authRepository.me()});
    }
  },
  async signOut() {
    try {
      await authRepository.logout();
    } finally {
      await secureTokenStore.clear();
      set({status: 'signedOut', user: null});
    }
  },
}));

