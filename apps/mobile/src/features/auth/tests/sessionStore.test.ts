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
const mockAccounts = [{id: 'user-1', email: 'ana@example.com'}, {id: 'user-2', email: 'bia@example.com'}];

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
    getState: jest.fn(() => ({remember: mockRememberAccount, forget: mockForgetAccount, accounts: mockAccounts})),
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

  it('keeps the widget locked for a new account awaiting email confirmation', async () => {
    tokenStore.set.mockResolvedValue();
    await useSessionStore.getState().authenticate({token: 'new-token', token_type: 'Bearer',
      user: {...user, email_verification_required: true, email_verified_at: null}});
    expect(setWidgetAuthentication).toHaveBeenCalledWith(false);
  });

  it('discards the revoked password-reset token without saving it again', async () => {
    useSessionStore.setState({status: 'signedIn', user});
    await useSessionStore.getState().clearPasswordResetCredentials(' ANA@EXAMPLE.COM ');
    expect(rememberedTokenStore.clear).toHaveBeenCalledWith('user-1');
    expect(rememberedTokenStore.clear).not.toHaveBeenCalledWith('user-2');
    expect(rememberedTokenStore.set).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(tokenStore.clear).toHaveBeenCalled();
  });

  it('preserves the active account when resetting another remembered account', async () => {
    useSessionStore.setState({status: 'signedIn', user});
    await useSessionStore.getState().clearPasswordResetCredentials('bia@example.com');
    expect(rememberedTokenStore.clear).toHaveBeenCalledWith('user-2');
    expect(tokenStore.clear).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).toBe(user);
  });

  it('ignores a verification refresh that finishes after switching accounts', async () => {
    useSessionStore.setState({status: 'signedIn', user});
    let finish!: (value: User) => void;
    repository.me.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const refresh = useSessionStore.getState().refreshUser();
    const other = {...user, id: 'user-2', email: 'bia@example.com'};
    useSessionStore.setState({user: other});
    finish({...user, email_verified_at: '2026-09-04T12:00:00Z'});
    await refresh;
    expect(useSessionStore.getState().user).toBe(other);
    expect(userStore.set).not.toHaveBeenCalled();
  });

  it('applies confirmed XP and level immediately and persists the progress', () => {
    useSessionStore.setState({status: 'signedIn', user});
    const progress = {current_xp: 10, required_xp: 200, remaining_xp: 190, percentage: 5};
    useSessionStore.getState().applyGamification(user.id, {xp_awarded: 20, xp_total: 560, level: 5, level_progress: progress, xp_multiplier: 2, streak: 11, new_achievements: ['level_5']});
    expect(useSessionStore.getState().user).toMatchObject({xp_total: 560, level: 5, level_progress: progress, xp_multiplier: 2});
    expect(userStore.set).toHaveBeenCalledWith(useSessionStore.getState().user);
  });

  it('ignores an older XP response and rewards for a different account', () => {
    const current = {...user, xp_total: 560, level: 5};
    useSessionStore.setState({status: 'signedIn', user: current});
    useSessionStore.getState().applyGamification(user.id, {xp_awarded: 10, xp_total: 550, level: 5, streak: 1, new_achievements: []});
    useSessionStore.getState().applyGamification('user-2', {xp_awarded: 10, xp_total: 1000, level: 7, streak: 1, new_achievements: []});
    expect(useSessionStore.getState().user).toBe(current);
    expect(userStore.set).not.toHaveBeenCalled();
  });

  it('does not lower a freshly earned level when a profile refresh arrives late', async () => {
    useSessionStore.setState({status: 'signedIn', user: {...user, level: 4, xp_total: 540}});
    let finish!: (value: User) => void;
    repository.me.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const refresh = useSessionStore.getState().refreshUser();
    useSessionStore.getState().applyGamification(user.id, {xp_awarded: 10, xp_total: 550, level: 5, streak: 1, new_achievements: ['level_5']});
    finish({...user, level: 4, xp_total: 540});
    await refresh;
    expect(useSessionStore.getState().user).toMatchObject({xp_total: 550, level: 5});
  });

  it('restores confirmed XP and consecutive days when signing in again', async () => {
    await useSessionStore.getState().authenticate({token: 'first-token', token_type: 'Bearer', user});
    useSessionStore.getState().applyGamification(user.id, {xp_awarded: 10, xp_total: 550, level: 5, streak: 3, new_achievements: []});
    const saved = useSessionStore.getState().user!;

    await useSessionStore.getState().signOut();
    await useSessionStore.getState().authenticate({token: 'second-token', token_type: 'Bearer', user: saved});

    expect(useSessionStore.getState().user).toMatchObject({xp_total: 550, level: 5, streak: 3});
    expect(userStore.set).toHaveBeenLastCalledWith(saved);
  });

  it('accepts a broken streak from the server without losing permanent XP', async () => {
    useSessionStore.setState({status: 'signedIn', user: {...user, xp_total: 550, level: 5, streak: 3}});
    repository.me.mockResolvedValueOnce({...user, xp_total: 550, level: 5, streak: 0});

    await useSessionStore.getState().refreshUser();

    expect(useSessionStore.getState().user).toMatchObject({xp_total: 550, level: 5, streak: 0});
  });

  it('does not carry XP or consecutive days into another account', async () => {
    useSessionStore.setState({status: 'signedIn', user: {...user, xp_total: 550, level: 5, streak: 3}});
    const other = {...user, id: 'user-2', email: 'bia@example.com', xp_total: 0, level: 1, streak: 0};

    await useSessionStore.getState().authenticate({token: 'other-token', token_type: 'Bearer', user: other});

    expect(useSessionStore.getState().user).toEqual(other);
    expect(userStore.set).toHaveBeenLastCalledWith(other);
  });

  it.each(['response', 'network error'])('keeps progress earned while bootstrap waits for a %s', async outcome => {
    tokenStore.hydrate.mockResolvedValue('active-token');
    userStore.hydrate.mockResolvedValue({...user, xp_total: 0, level: 1, streak: 0});
    let finish!: (value: User) => void;
    let fail!: (error: Error) => void;
    const requested = new Promise<void>(started => {
      repository.me.mockImplementationOnce(() => {
        started();
        return new Promise((resolve, reject) => {finish = resolve; fail = reject;});
      });
    });
    const bootstrap = useSessionStore.getState().bootstrap();
    await requested;
    useSessionStore.getState().applyGamification(user.id, {xp_awarded: 10, xp_total: 550, level: 5, streak: 3, new_achievements: []});
    if (outcome === 'response') finish({...user, xp_total: 0, level: 1, streak: 0});
    else fail(new AppError('Sem rede', 'NETWORK_UNAVAILABLE'));
    await bootstrap;

    expect(useSessionStore.getState().user).toMatchObject({xp_total: 550, level: 5, streak: 3});
    expect(userStore.set).toHaveBeenLastCalledWith(expect.objectContaining({xp_total: 550, level: 5, streak: 3}));
  });

  it.each(['response', 'unauthorized'])('ignores an old bootstrap %s after signing out and in', async outcome => {
    tokenStore.hydrate.mockResolvedValue('active-token');
    userStore.hydrate.mockResolvedValue({...user, xp_total: 0, streak: 0});
    let finish!: (value: User) => void;
    let fail!: (error: Error) => void;
    const requested = new Promise<void>(started => {
      repository.me.mockImplementationOnce(() => {
        started();
        return new Promise((resolve, reject) => {finish = resolve; fail = reject;});
      });
    });
    const bootstrap = useSessionStore.getState().bootstrap();
    await requested;
    await useSessionStore.getState().signOut();
    const restored = {...user, xp_total: 550, level: 5, streak: 3};
    await useSessionStore.getState().authenticate({token: 'new-token', token_type: 'Bearer', user: restored});
    userStore.clear.mockClear();

    if (outcome === 'response') finish({...user, xp_total: 0, streak: 0});
    else fail(new AppError('Expirado', 'UNAUTHENTICATED', 401));
    await bootstrap;

    expect(useSessionStore.getState()).toMatchObject({status: 'signedIn', user: restored});
    expect(userStore.set).toHaveBeenLastCalledWith(restored);
    expect(userStore.clear).not.toHaveBeenCalled();
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

  it('does not clear a new login when an old unauthenticated cache read finishes', async () => {
    tokenStore.hydrate.mockResolvedValue(null);
    let finish!: (value: User | null) => void;
    userStore.hydrate.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    await useSessionStore.getState().bootstrap();
    const restored = {...user, xp_total: 550, level: 5, streak: 3};
    await useSessionStore.getState().authenticate({token: 'new-token', token_type: 'Bearer', user: restored});

    finish(null);
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(userStore.clear).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).toEqual(restored);
  });
});
