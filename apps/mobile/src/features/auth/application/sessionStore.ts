import type {User} from '@aqualino/contracts';
import {create} from 'zustand';
import {AppError} from '../../../shared/errors/AppError';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {secureUserStore} from '../../../shared/security/secureUserStore';
import {secureRememberedTokenStore} from '../../../shared/security/secureRememberedTokenStore';
import {reloadWidget, setWidgetAuthenticationState} from '../../widget/data/widgetBridge';
import {authRepository, type AuthResult} from '../data/authRepository';
import {useRememberedAccountsStore} from './rememberedAccountsStore';

type SessionStatus = 'booting' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  user: User | null;
  bootstrap: () => Promise<void>;
  authenticate: (result: AuthResult) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  resumeRememberedAccount: (accountId: string) => Promise<boolean>;
  removeRememberedAccount: (accountId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  user: null,
  async bootstrap() {
    const tokenPromise = secureTokenStore.hydrate();
    const cachedUserPromise = secureUserStore.hydrate().catch(() => null);
    const token = await tokenPromise;
    if (!token) {
      set({status: 'signedOut', user: null});
      updateWidgetAuthenticationSafely(false);
      cachedUserPromise
        .then(() => secureUserStore.clear())
        .catch(() => undefined);
      return;
    }

    reloadWidgetSafely();

    const cachedUser = await cachedUserPromise;
    if (cachedUser) {
      useRememberedAccountsStore.getState().remember(cachedUser);
      set({status: 'signedIn', user: cachedUser});
    }

    try {
      const user = await authRepository.me();
      await secureUserStore.set(user).catch(() => undefined);
      useRememberedAccountsStore.getState().remember(user);
      set({status: 'signedIn', user});
    } catch (error) {
      if (isInvalidSession(error)) {
        await clearLocalSession();
        updateWidgetAuthenticationSafely(false);
        set({status: 'signedOut', user: null});
      } else if (cachedUser) {
        set({status: 'signedIn', user: cachedUser});
      } else {
        // Preserve the token so a later app start can retry /me without a new login.
        updateWidgetAuthenticationSafely(false);
        set({status: 'signedOut', user: null});
      }
    }
  },
  async authenticate(result) {
    await secureTokenStore.set(result.token);
    await secureUserStore.set(result.user).catch(() => undefined);
    await secureRememberedTokenStore.set(result.user.id, result.token).catch(() => undefined);
    useRememberedAccountsStore.getState().remember(result.user);
    updateWidgetAuthenticationSafely(true);
    set({status: 'signedIn', user: result.user});
  },
  async refreshUser() {
    if (get().status === 'signedIn') {
      const user = await authRepository.me();
      await secureUserStore.set(user).catch(() => undefined);
      set({user});
    }
  },
  async signOut() {
    const user = get().user;
    const token = secureTokenStore.getCached();
    if (user && token) {
      await secureRememberedTokenStore.set(user.id, token).catch(() => undefined);
    }
    await clearLocalSession();
    updateWidgetAuthenticationSafely(false);
    set({status: 'signedOut', user: null});
  },
  async resumeRememberedAccount(accountId) {
    const token = await secureRememberedTokenStore.get(accountId);
    if (!token) return false;

    await secureTokenStore.set(token);
    try {
      const user = await authRepository.me();
      await get().authenticate({token, token_type: 'Bearer', user});
      return true;
    } catch (error) {
      await clearLocalSession();
      if (isInvalidSession(error)) {
        await secureRememberedTokenStore.clear(accountId).catch(() => undefined);
        useRememberedAccountsStore.getState().forget(accountId);
      }
      updateWidgetAuthenticationSafely(false);
      set({status: 'signedOut', user: null});
      throw error;
    }
  },
  async removeRememberedAccount(accountId) {
    const token = await secureRememberedTokenStore.get(accountId);
    if (token) {
      await secureTokenStore.set(token);
      try {
        await authRepository.logout();
      } catch (error) {
        if (!isInvalidSession(error)) throw error;
      }
    }

    await Promise.allSettled([
      secureRememberedTokenStore.clear(accountId),
      clearLocalSession(),
    ]);
    useRememberedAccountsStore.getState().forget(accountId);
    updateWidgetAuthenticationSafely(false);
    set({status: 'signedOut', user: null});
  },
}));

function isInvalidSession(error: unknown): boolean {
  return error instanceof AppError && error.status === 401;
}

function updateWidgetAuthenticationSafely(isAuthenticated: boolean): void {
  try {
    setWidgetAuthenticationState(isAuthenticated);
  } catch {
    // Widget availability must never block login, logout, or session recovery.
  }
}

function reloadWidgetSafely(): void {
  try {
    reloadWidget();
  } catch {
    // A stale widget must never prevent the saved session from being restored.
  }
}

async function clearLocalSession(): Promise<void> {
  await Promise.allSettled([
    secureTokenStore.clear(),
    secureUserStore.clear(),
  ]);
}
