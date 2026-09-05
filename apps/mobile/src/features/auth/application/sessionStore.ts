import type {RecordWaterResult, User} from '@aqualino/contracts';
import {create} from 'zustand';
import {AppError} from '../../../shared/errors/AppError';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {secureUserStore} from '../../../shared/security/secureUserStore';
import {secureRememberedTokenStore} from '../../../shared/security/secureRememberedTokenStore';
import {reloadWidget, setWidgetAuthenticationState} from '../../widget/data/widgetBridge';
import {authRepository, type AuthResult} from '../data/authRepository';
import {useRememberedAccountsStore} from './rememberedAccountsStore';
import {requiresEmailVerification} from './emailVerification';

type SessionStatus = 'booting' | 'signedOut' | 'signedIn';
let sessionRevision = 0;

interface SessionState {
  status: SessionStatus;
  user: User | null;
  bootstrap: () => Promise<void>;
  authenticate: (result: AuthResult) => Promise<void>;
  refreshUser: () => Promise<void>;
  applyGamification: (userId: string, snapshot: RecordWaterResult['gamification']) => void;
  signOut: () => Promise<void>;
  clearPasswordResetCredentials: (email: string) => Promise<void>;
  resumeRememberedAccount: (accountId: string) => Promise<boolean>;
  removeRememberedAccount: (accountId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  user: null,
  async bootstrap() {
    const revision = ++sessionRevision;
    const tokenPromise = secureTokenStore.hydrate();
    const cachedUserPromise = secureUserStore.hydrate().catch(() => null);
    const token = await tokenPromise;
    if (revision !== sessionRevision) return;
    if (!token) {
      set({status: 'signedOut', user: null});
      updateWidgetAuthenticationSafely(false);
      cachedUserPromise
        .then(() => revision === sessionRevision ? secureUserStore.clear() : undefined)
        .catch(() => undefined);
      return;
    }

    reloadWidgetSafely();

    const cachedUser = await cachedUserPromise;
    if (revision !== sessionRevision) return;
    if (cachedUser) {
      updateWidgetAuthenticationSafely(!requiresEmailVerification(cachedUser));
      useRememberedAccountsStore.getState().remember(cachedUser);
      set({status: 'signedIn', user: cachedUser});
    }

    try {
      const response = await authRepository.me();
      if (revision !== sessionRevision) return;
      const user = preserveConfirmedProgress(response, get().user);
      useRememberedAccountsStore.getState().remember(user);
      updateWidgetAuthenticationSafely(!requiresEmailVerification(user));
      set({status: 'signedIn', user});
      await secureUserStore.set(user).catch(() => undefined);
    } catch (error) {
      if (revision !== sessionRevision) return;
      if (isInvalidSession(error)) {
        updateWidgetAuthenticationSafely(false);
        set({status: 'signedOut', user: null});
        await clearLocalSession();
      } else if (!cachedUser) {
        // Preserve the token so a later app start can retry /me without a new login.
        updateWidgetAuthenticationSafely(false);
        set({status: 'signedOut', user: null});
      }
    }
  },
  async authenticate(result) {
    const revision = ++sessionRevision;
    await secureTokenStore.set(result.token);
    if (revision !== sessionRevision) return;
    await secureRememberedTokenStore.set(result.user.id, result.token).catch(() => undefined);
    if (revision !== sessionRevision) return;
    const user = preserveConfirmedProgress(result.user, get().user);
    useRememberedAccountsStore.getState().remember(user);
    updateWidgetAuthenticationSafely(!requiresEmailVerification(user));
    set({status: 'signedIn', user});
    await secureUserStore.set(user).catch(() => undefined);
  },
  applyGamification(userId, snapshot) {
    const current = get().user;
    if (get().status !== 'signedIn' || current?.id !== userId || snapshot.xp_total < (current.xp_total ?? 0) || snapshot.level < (current.level ?? 1)) return;
    const user = {...current, xp_total: snapshot.xp_total, xp_multiplier: snapshot.xp_multiplier ?? current.xp_multiplier, level: snapshot.level, level_progress: snapshot.level_progress ?? current.level_progress, streak: snapshot.streak};
    set({user});
    secureUserStore.set(user).catch(() => undefined);
  },
  async refreshUser() {
    if (get().status === 'signedIn') {
      const revision = sessionRevision;
      const accountId = get().user?.id;
      const token = secureTokenStore.getCached();
      const response = await authRepository.me();
      if (revision !== sessionRevision || get().status !== 'signedIn' || get().user?.id !== accountId || secureTokenStore.getCached() !== token || response.id !== accountId) return;
      const user = preserveConfirmedProgress(response, get().user);
      updateWidgetAuthenticationSafely(!requiresEmailVerification(user));
      set({user});
      await secureUserStore.set(user).catch(() => undefined);
    }
  },
  async clearPasswordResetCredentials(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = get().user;
    const accountIds = new Set(useRememberedAccountsStore.getState().accounts
      .filter(account => account.email.toLowerCase() === normalizedEmail).map(account => account.id));
    if (user?.email.toLowerCase() === normalizedEmail) accountIds.add(user.id);
    await Promise.allSettled([...accountIds].map(id => secureRememberedTokenStore.clear(id)));
    if (user && accountIds.has(user.id) && get().user?.id === user.id) {
      sessionRevision++;
      // A reset revokes this token on the server; never save it again through signOut.
      set({status: 'signedOut', user: null});
      updateWidgetAuthenticationSafely(false);
      await clearLocalSession();
    }
  },
  async signOut() {
    const revision = ++sessionRevision;
    const user = get().user;
    const token = secureTokenStore.getCached();
    if (user && token) {
      await secureRememberedTokenStore.set(user.id, token).catch(() => undefined);
    }
    if (revision !== sessionRevision) return;
    await clearLocalSession();
    if (revision !== sessionRevision) return;
    updateWidgetAuthenticationSafely(false);
    set({status: 'signedOut', user: null});
  },
  async resumeRememberedAccount(accountId) {
    const revision = ++sessionRevision;
    const token = await secureRememberedTokenStore.get(accountId);
    if (!token || revision !== sessionRevision) return false;

    await secureTokenStore.set(token);
    if (revision !== sessionRevision) return false;
    try {
      const user = await authRepository.me();
      if (revision !== sessionRevision) return false;
      await get().authenticate({token, token_type: 'Bearer', user});
      return true;
    } catch (error) {
      if (revision !== sessionRevision) return false;
      await clearLocalSession();
      if (revision !== sessionRevision) return false;
      if (isInvalidSession(error)) {
        await secureRememberedTokenStore.clear(accountId).catch(() => undefined);
        useRememberedAccountsStore.getState().forget(accountId);
      }
      if (revision !== sessionRevision) return false;
      updateWidgetAuthenticationSafely(false);
      set({status: 'signedOut', user: null});
      throw error;
    }
  },
  async removeRememberedAccount(accountId) {
    sessionRevision++;
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

function preserveConfirmedProgress(incoming: User, current: User | null): User {
  if (!current || incoming.id !== current.id) return incoming;
  if ((incoming.xp_total ?? 0) < (current.xp_total ?? 0) || (incoming.level ?? 1) < (current.level ?? 1)) {
    return {...incoming, xp_total: current.xp_total, level: current.level, level_progress: current.level_progress, streak: current.streak, xp_multiplier: current.xp_multiplier};
  }
  return incoming;
}

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
