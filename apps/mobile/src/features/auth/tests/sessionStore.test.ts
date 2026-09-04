import type {User} from '@aqualino/contracts';
import {AppError} from '../../../shared/errors/AppError';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {secureUserStore} from '../../../shared/security/secureUserStore';
import {secureRememberedTokenStore} from '../../../shared/security/secureRememberedTokenStore';
import {reloadWidget, setWidgetAuthenticationState} from '../../widget/data/widgetBridge';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';

const mockRememberAccount = jest.fn();
const mockForgetAccount = jest.fn();

jest.mock('../../../shared/security/secureTokenStore', () => ({
  secureTokenStore: {
    hydrate: jest.fn(),
    getCached: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../../../shared/security/secureUserStore', () => ({
  secureUserStore: {
    hydrate: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../../../shared/security/secureRememberedTokenStore', () => ({
  secureRememberedTokenStore: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../data/authRepository', () => ({
  authRepository: {
    me: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../../widget/data/widgetBridge', () => ({
  reloadWidget: jest.fn(),
  setWidgetAuthenticationState: jest.fn(),
}));

jest.mock('../application/rememberedAccountsStore', () => ({
  useRememberedAccountsStore: {
    getState: jest.fn(() => ({remember: mockRememberAccount, forget: mockForgetAccount})),
  },
}));

const tokenStore = secureTokenStore as jest.Mocked<typeof secureTokenStore>;
const userStore = secureUserStore as jest.Mocked<typeof secureUserStore>;
const rememberedTokenStore = secureRememberedTokenStore as jest.Mocked<typeof secureRememberedTokenStore>;
const repository = authRepository as jest.Mocked<typeof authRepository>;
const setWidgetAuthentication = setWidgetAuthenticationState as jest.MockedFunction<typeof setWidgetAuthenticationState>;
const reloadWidgetState = reloadWidget as jest.MockedFunction<typeof reloadWidget>;

const user: User = {
  id: 'user-1',
  email: 'ana@example.com',
  profile: {
    user_id: 'user-1',
    display_name: 'Ana',
    username: 'ana',
    avatar_url: null,
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    favorite_volumes_ml: [200, 300, 500],
    onboarding_completed_at: '2026-09-01T12:00:00Z',
  },
};

describe('sessionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({status: 'booting', user: null});
    tokenStore.getCached.mockReturnValue('active-token');
    tokenStore.clear.mockResolvedValue();
    userStore.hydrate.mockResolvedValue(null);
    userStore.clear.mockResolvedValue();
    userStore.set.mockResolvedValue();
    rememberedTokenStore.get.mockResolvedValue(null);
    rememberedTokenStore.set.mockResolvedValue();
    rememberedTokenStore.clear.mockResolvedValue();
  });

  it('keeps the cached session when /me is temporarily unavailable', async () => {
    tokenStore.hydrate.mockResolvedValue('token');
    userStore.hydrate.mockResolvedValue(user);
    repository.me.mockRejectedValue(new AppError('Sem rede', 'NETWORK_UNAVAILABLE'));

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState()).toMatchObject({status: 'signedIn', user});
    expect(tokenStore.clear).not.toHaveBeenCalled();
    expect(userStore.clear).not.toHaveBeenCalled();
    expect(reloadWidgetState).toHaveBeenCalledTimes(1);
  });

  it('clears the local session only when the server rejects the token', async () => {
    tokenStore.hydrate.mockResolvedValue('expired-token');
    userStore.hydrate.mockResolvedValue(user);
    repository.me.mockRejectedValue(new AppError('Não autenticado', 'UNAUTHENTICATED', 401));

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState()).toMatchObject({status: 'signedOut', user: null});
    expect(tokenStore.clear).toHaveBeenCalledTimes(1);
    expect(userStore.clear).toHaveBeenCalledTimes(1);
    expect(setWidgetAuthentication).toHaveBeenCalledWith(false);
  });

  it('persists the user together with a successful authentication', async () => {
    tokenStore.set.mockResolvedValue();

    await useSessionStore.getState().authenticate({token: 'new-token', token_type: 'Bearer', user});

    expect(tokenStore.set).toHaveBeenCalledWith('new-token');
    expect(userStore.set).toHaveBeenCalledWith(user);
    expect(rememberedTokenStore.set).toHaveBeenCalledWith(user.id, 'new-token');
    expect(mockRememberAccount).toHaveBeenCalledWith(user);
    expect(setWidgetAuthentication).toHaveBeenCalledWith(true);
    expect(useSessionStore.getState()).toMatchObject({status: 'signedIn', user});
  });

  it('ends only the active session when signing out', async () => {
    useSessionStore.setState({status: 'signedIn', user});

    await useSessionStore.getState().signOut();

    expect(repository.logout).not.toHaveBeenCalled();
    expect(rememberedTokenStore.clear).not.toHaveBeenCalled();
    expect(rememberedTokenStore.set).toHaveBeenCalledWith(user.id, 'active-token');
    expect(useSessionStore.getState()).toMatchObject({status: 'signedOut', user: null});
  });

  it('restores a remembered account with its protected device token', async () => {
    rememberedTokenStore.get.mockResolvedValue('saved-token');
    repository.me.mockResolvedValue(user);

    const restored = await useSessionStore.getState().resumeRememberedAccount(user.id);

    expect(restored).toBe(true);
    expect(tokenStore.set).toHaveBeenCalledWith('saved-token');
    expect(useSessionStore.getState()).toMatchObject({status: 'signedIn', user});
  });

  it('keeps the saved account when reconnecting is unavailable', async () => {
    rememberedTokenStore.get.mockResolvedValue('saved-token');
    repository.me.mockRejectedValue(new AppError('Sem conexão', 'NETWORK_UNAVAILABLE'));

    await expect(useSessionStore.getState().resumeRememberedAccount(user.id)).rejects.toMatchObject({
      code: 'NETWORK_UNAVAILABLE',
    });

    expect(rememberedTokenStore.clear).not.toHaveBeenCalled();
    expect(mockForgetAccount).not.toHaveBeenCalled();
  });

  it('revokes and forgets an account only when it is removed from device management', async () => {
    rememberedTokenStore.get.mockResolvedValue('saved-token');
    repository.logout.mockResolvedValue();

    await useSessionStore.getState().removeRememberedAccount(user.id);

    expect(repository.logout).toHaveBeenCalledTimes(1);
    expect(rememberedTokenStore.clear).toHaveBeenCalledWith(user.id);
    expect(mockForgetAccount).toHaveBeenCalledWith(user.id);
  });

  it('shows the disconnected widget state when there is no local session', async () => {
    tokenStore.hydrate.mockResolvedValue(null);

    await useSessionStore.getState().bootstrap();

    expect(setWidgetAuthentication).toHaveBeenCalledWith(false);
    expect(useSessionStore.getState()).toMatchObject({status: 'signedOut', user: null});
  });

  it('does not wait for the cached user read when there is no token', async () => {
    tokenStore.hydrate.mockResolvedValue(null);
    userStore.hydrate.mockReturnValue(new Promise<User | null>(() => undefined));

    await useSessionStore.getState().bootstrap();

    expect(useSessionStore.getState()).toMatchObject({status: 'signedOut', user: null});
    expect(repository.me).not.toHaveBeenCalled();
  });
});
