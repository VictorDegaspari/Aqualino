import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {User} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppError} from '../../../shared/errors/AppError';
import {requiresEmailVerification} from '../application/emailVerification';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {ForgotPasswordScreen} from '../presentation/ForgotPasswordScreen';
import {ResetPasswordScreen} from '../presentation/ResetPasswordScreen';
import {VerifyEmailScreen} from '../presentation/VerifyEmailScreen';

jest.mock('../data/authRepository', () => ({authRepository: {
  forgotPassword: jest.fn(), resetPassword: jest.fn(), resendVerification: jest.fn(),
}}));
jest.mock('../application/sessionStore', () => ({useSessionStore: jest.requireActual('zustand').create(() => ({
  user: null, refreshUser: jest.fn(), signOut: jest.fn(), clearPasswordResetCredentials: jest.fn(),
}))}));
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({
  useOnboardingPreferencesStore: (selector: (state: {locale: 'pt-BR'}) => unknown) => selector({locale: 'pt-BR'}),
}));

const repository = jest.mocked(authRepository);
const navigation = {replace: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn(() => true), goBack: jest.fn()};
const resetParams = {email: 'ana@example.com', token: 'a'.repeat(64)};
const pendingUser: User = {
  id: 'ana', email: 'ana@example.com', email_verified_at: null, email_verification_required: true,
  profile: {user_id: 'ana', display_name: 'Ana', username: 'ana', avatar_url: null, timezone: 'America/Sao_Paulo',
    locale: 'pt-BR', favorite_volumes_ml: [200], onboarding_completed_at: '2026-09-04T12:00:00Z'},
};
function props<Route extends 'ForgotPassword' | 'ResetPassword'>(name: Route, params?: RootStackParamList[Route]): NativeStackScreenProps<RootStackParamList, Route> {
  return {navigation, route: {name, key: name, params}} as unknown as NativeStackScreenProps<RootStackParamList, Route>;
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.forgotPassword.mockResolvedValue({message: 'generic', retry_after: 60});
  repository.resetPassword.mockResolvedValue({message: 'ok'});
  repository.resendVerification.mockResolvedValue({email_verified_at: null, retry_after: 60});
  useSessionStore.setState({user: pendingUser, status: 'signedIn'});
  jest.mocked(useSessionStore.getState().refreshUser).mockResolvedValue();
  jest.mocked(useSessionStore.getState().clearPasswordResetCredentials).mockResolvedValue();
});
afterEach(() => {jest.useRealTimers(); jest.restoreAllMocks();});

test('recovery validates email, normalizes it, and presents the same private sent state with a resend cooldown', async () => {
  jest.useFakeTimers();
  const view = await render(<ForgotPasswordScreen {...props('ForgotPassword')} />);
  await fireEvent.changeText(view.getByLabelText('E-mail'), 'invalid');
  await fireEvent.press(view.getByRole('button', {name: 'Enviar link de recuperação'}));
  expect(repository.forgotPassword).not.toHaveBeenCalled();
  expect(view.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
  await fireEvent.changeText(view.getByLabelText('E-mail'), ' ANA@Example.com ');
  await fireEvent.press(view.getByRole('button', {name: 'Enviar link de recuperação'}));
  expect(repository.forgotPassword).toHaveBeenCalledWith('ana@example.com');
  expect(view.getByText('ana@example.com')).toBeTruthy();
  expect(view.getByText(/Se houver uma conta/)).toBeTruthy();
  expect(view.getByRole('button', {name: 'Reenviar em 60s'})).toBeDisabled();
  await act(() => jest.advanceTimersByTime(60_000));
  await fireEvent.press(view.getByRole('button', {name: 'Reenviar e-mail'}));
  expect(repository.forgotPassword).toHaveBeenCalledTimes(2);
  await fireEvent.press(view.getByRole('button', {name: 'Usar outro e-mail'}));
  expect(view.getByLabelText('E-mail')).toBeTruthy();
});

test('recovery keeps the form on network failure and allows retry', async () => {
  repository.forgotPassword.mockRejectedValueOnce(new AppError('Queue hint inappropriate here', 'NETWORK_UNAVAILABLE'));
  const view = await render(<ForgotPasswordScreen {...props('ForgotPassword', {email: 'ana@example.com'})} />);
  await fireEvent.press(view.getByRole('button', {name: 'Enviar link de recuperação'}));
  expect(view.getByRole('alert')).toHaveTextContent(/Confira sua conexão/);
  expect(view.queryByText('Confira seu e-mail')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Enviar link de recuperação'}));
  expect(view.getByText('Confira seu e-mail')).toBeTruthy();
});

test('recovery cannot issue a second request while the first one is pending', async () => {
  let finish!: (result: {message: string; retry_after: number}) => void;
  repository.forgotPassword.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
  const view = await render(<ForgotPasswordScreen {...props('ForgotPassword', {email: 'ana@example.com'})} />);
  await act(() => {
    const submit = view.getByLabelText('E-mail').props.onSubmitEditing;
    submit();
    submit();
  });
  expect(repository.forgotPassword).toHaveBeenCalledTimes(1);
  await act(() => finish({message: 'ok', retry_after: 60}));
});

test('reset rejects a weak password and mismatched confirmation before contacting the API', async () => {
  const view = await render(<ResetPasswordScreen {...props('ResetPassword', resetParams)} />);
  await fireEvent.changeText(view.getByLabelText('Nova senha'), 'abcdefgh');
  await fireEvent.changeText(view.getByLabelText('Confirmar nova senha'), 'abcdefgh');
  await fireEvent.press(view.getByRole('button', {name: 'Salvar nova senha'}));
  expect(view.getByRole('alert')).toHaveTextContent(/letras e números/);
  await fireEvent.changeText(view.getByLabelText('Nova senha'), 'novaSenha123');
  await fireEvent.press(view.getByRole('button', {name: 'Salvar nova senha'}));
  expect(view.getByRole('alert')).toHaveTextContent('As senhas precisam ser iguais.');
  expect(repository.resetPassword).not.toHaveBeenCalled();
});

test('successful reset clears the affected credentials and asks for a new login', async () => {
  const view = await render(<ResetPasswordScreen {...props('ResetPassword', resetParams)} />);
  await fireEvent.changeText(view.getByLabelText('Nova senha'), 'novaSenha123');
  await fireEvent.changeText(view.getByLabelText('Confirmar nova senha'), 'novaSenha123');
  await fireEvent.press(view.getByRole('button', {name: 'Salvar nova senha'}));
  expect(repository.resetPassword).toHaveBeenCalledWith({...resetParams, password: 'novaSenha123', password_confirmation: 'novaSenha123'});
  expect(useSessionStore.getState().clearPasswordResetCredentials).toHaveBeenCalledWith(resetParams.email);
  expect(view.getByText('Senha atualizada!')).toBeTruthy();
  expect(view.queryByLabelText('Nova senha')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Entrar com a nova senha'}));
  expect(navigation.replace).toHaveBeenCalledWith('SignIn', {email: resetParams.email});
});

test('expired reset links provide a new-link action without changing local credentials', async () => {
  repository.resetPassword.mockRejectedValueOnce(new AppError('Expired', 'PASSWORD_RESET_INVALID', 422));
  const view = await render(<ResetPasswordScreen {...props('ResetPassword', resetParams)} />);
  await fireEvent.changeText(view.getByLabelText('Nova senha'), 'novaSenha123');
  await fireEvent.changeText(view.getByLabelText('Confirmar nova senha'), 'novaSenha123');
  await fireEvent.press(view.getByRole('button', {name: 'Salvar nova senha'}));
  expect(useSessionStore.getState().clearPasswordResetCredentials).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: 'Solicitar novo link'}));
  expect(navigation.replace).toHaveBeenCalledWith('ForgotPassword', {email: resetParams.email});
});

test('missing reset parameters are recoverable and a new link starts a fresh form', async () => {
  const view = await render(<ResetPasswordScreen {...props('ResetPassword')} />);
  expect(view.queryByLabelText('Nova senha')).toBeNull();
  expect(view.getByText('Vamos pedir um novo link')).toBeTruthy();
  await view.rerender(<ResetPasswordScreen {...props('ResetPassword', {...resetParams, locale: 'en-US'})} />);
  expect(view.getByLabelText('New password')).toBeTruthy();
  expect(view.getByText('Create a new password')).toBeTruthy();
});

test('confirmation checks server state and never unlocks a pending account merely by pressing the button', async () => {
  const view = await render(<VerifyEmailScreen />);
  await fireEvent.press(view.getByRole('button', {name: 'Já confirmei meu e-mail'}));
  expect(useSessionStore.getState().refreshUser).toHaveBeenCalledTimes(2);
  expect(view.getByText(/A confirmação ainda não chegou/)).toBeTruthy();
  expect(requiresEmailVerification(useSessionStore.getState().user)).toBe(true);
});

test('returning from the email app refreshes the verified state and cleans up its listener', async () => {
  const remove = jest.fn();
  const listener = jest.spyOn(AppState, 'addEventListener').mockReturnValue({remove});
  const view = await render(<VerifyEmailScreen />);
  jest.mocked(useSessionStore.getState().refreshUser).mockImplementationOnce(async () => {
    useSessionStore.setState({user: {...pendingUser, email_verified_at: '2026-09-04T12:00:00Z'}});
  });
  await act(() => listener.mock.calls[0][1]('active'));
  expect(requiresEmailVerification(useSessionStore.getState().user)).toBe(false);
  await view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('confirmation resend waits for cooldown and restarts it after a successful request', async () => {
  jest.useFakeTimers();
  const view = await render(<VerifyEmailScreen />);
  expect(view.getByRole('button', {name: 'Reenviar em 60s'})).toBeDisabled();
  await act(() => jest.advanceTimersByTime(60_000));
  await fireEvent.press(view.getByRole('button', {name: 'Reenviar e-mail'}));
  expect(repository.resendVerification).toHaveBeenCalledTimes(1);
  expect(view.getByText(/E-mail solicitado/)).toBeTruthy();
  expect(view.getByRole('button', {name: 'Reenviar em 60s'})).toBeDisabled();
  expect(requiresEmailVerification(useSessionStore.getState().user)).toBe(true);
});
