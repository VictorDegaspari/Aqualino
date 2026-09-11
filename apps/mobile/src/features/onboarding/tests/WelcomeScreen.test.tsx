import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {Alert} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {WelcomeScreen} from '../presentation/WelcomeScreen';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));

const mockRequestWidgetPin = jest.fn();
jest.mock('../../widget/application/requestWidgetPin', () => ({requestWidgetPin: () => mockRequestWidgetPin()}));

const mockRestartWelcome = jest.fn();
const mockCompleteWelcome = jest.fn();
const mockSelectLocale = jest.fn();
const mockSelectDailyGoal = jest.fn();
const mockResumeRememberedAccount = jest.fn();
const mockRemoveRememberedAccount = jest.fn();

const mockOnboardingState = {
  hasCompletedWelcome: true,
  locale: 'pt-BR' as const,
  dailyGoalMl: 2_000,
  hasSelectedDailyGoal: true,
  completeWelcome: mockCompleteWelcome,
  restartWelcome: mockRestartWelcome,
  selectLocale: mockSelectLocale,
  selectDailyGoal: mockSelectDailyGoal,
  clearSelectedDailyGoal: jest.fn(),
};

const mockAccountsState = {
  accounts: [{
    id: 'user-1',
    email: 'ana@example.com',
    displayName: 'Ana',
    username: 'ana',
    avatarUrl: null,
  }],
};

jest.mock('../application/onboardingPreferencesStore', () => ({
  useOnboardingPreferencesStore: jest.fn((selector: (state: typeof mockOnboardingState) => unknown) => selector(mockOnboardingState)),
}));

jest.mock('../../auth/application/rememberedAccountsStore', () => ({
  useRememberedAccountsStore: jest.fn((selector: (state: typeof mockAccountsState) => unknown) => selector(mockAccountsState)),
}));

jest.mock('../../auth/application/sessionStore', () => ({
  useSessionStore: jest.fn((selector: (state: {resumeRememberedAccount: typeof mockResumeRememberedAccount; removeRememberedAccount: typeof mockRemoveRememberedAccount}) => unknown) => selector({
    resumeRememberedAccount: mockResumeRememberedAccount,
    removeRememberedAccount: mockRemoveRememberedAccount,
  })),
}));

jest.mock('../../auth/presentation/LoginScreen', () => {
  const ReactModule = require('react');
  const {Pressable, Text} = require('react-native');
  return {
    LoginForm: ({onCreateAccount}: {onCreateAccount?: () => void}) => ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(Text, null, 'FORMULÁRIO DE LOGIN'),
      ReactModule.createElement(
        Pressable,
        {accessibilityRole: 'button', accessibilityLabel: 'Criar uma nova conta', onPress: onCreateAccount},
        ReactModule.createElement(Text, null, 'Criar uma nova conta'),
      ),
    ),
  };
});

jest.mock('../../auth/presentation/RegisterScreen', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');
  return {RegisterForm: () => ReactModule.createElement(Text, null, 'FORMULÁRIO DE CADASTRO')};
});

jest.mock('../../hydration/presentation/HydrationWaterGauge', () => ({
  HydrationWaterGauge: () => null,
}));

describe('WelcomeScreen account flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestWidgetPin.mockResolvedValue(true);
    mockOnboardingState.hasCompletedWelcome = true;
    mockResumeRememberedAccount.mockResolvedValue(false);
  });

  it('shows remembered accounts after logout outside of the onboarding steps', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('ana@example.com')).toBeTruthy();
    expect(view.queryByText('Etapa 4 de 4')).toBeNull();

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(view.getByText('FORMULÁRIO DE LOGIN')).toBeTruthy();
    expect(view.queryByText('Etapa 4 de 4')).toBeNull();
  });

  it('resumes a saved account without asking for a password', async () => {
    let finish!: (resumed: boolean) => void;
    mockResumeRememberedAccount.mockReturnValueOnce(new Promise<boolean>(resolve => {finish = resolve;}));
    const view = await render(<WelcomeScreen />);

    const signingIn = fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));
    await waitFor(() => expect(view.getByTestId('saved-account-signing-in')).toBeTruthy());
    expect(view.getByText('Entrando')).toBeTruthy();
    expect(view.getByRole('button', {name: 'Continuar como Ana'})).toBeDisabled();
    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));
    expect(mockResumeRememberedAccount).toHaveBeenCalledTimes(1);

    await act(() => finish(true));
    await signingIn;

    expect(mockResumeRememberedAccount).toHaveBeenCalledWith('user-1');
    expect(view.queryByText('FORMULÁRIO DE LOGIN')).toBeNull();
    expect(view.queryByTestId('saved-account-signing-in')).toBeNull();
    expect(view.queryByText('Entrando')).toBeNull();
    expect(view.getByRole('button', {name: 'Continuar como Ana'})).toBeEnabled();
  });

  it('keeps the saved account and explains when it is offline', async () => {
    mockResumeRememberedAccount.mockRejectedValue(new AppError('Sem conexão', 'NETWORK_UNAVAILABLE'));
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('Você não está conectado à internet. Verifique sua conexão e tente novamente.')).toBeTruthy();
    expect(view.queryByTestId('saved-account-signing-in')).toBeNull();
    expect(view.getByRole('button', {name: 'Continuar como Ana'})).toBeEnabled();
  });

  it('removes a saved account only from account management', async () => {
    mockRemoveRememberedAccount.mockResolvedValue(undefined);
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Gerenciar contas'}));
    expect(view.getByRole('button', {name: 'Remover conta ana@example.com'})).toBeTruthy();

    await fireEvent.press(view.getByRole('button', {name: 'Remover conta ana@example.com'}));
    expect(mockRemoveRememberedAccount).toHaveBeenCalledWith('user-1');
  });

  it('restarts onboarding when a new account is added', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByText('Adicionar nova conta'));

    expect(mockRestartWelcome).toHaveBeenCalledTimes(1);
    expect(view.getByText('Etapa 1 de 4')).toBeTruthy();
    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });

  it('restarts onboarding when registration is chosen from login', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));
    await fireEvent.press(view.getByRole('button', {name: 'Criar uma nova conta'}));

    expect(mockRestartWelcome).toHaveBeenCalledTimes(1);
    expect(view.getByText('Etapa 1 de 4')).toBeTruthy();
    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });

  it('keeps progress and back navigation in sync through registration on first access', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    const view = await render(<WelcomeScreen />);
    await fireEvent.press(view.getByTestId('welcome-new-account'));
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(1);
    expect(view.getByRole('button', {name: 'Voltar'})).toBeTruthy();

    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(2);
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    expect(view.getByTestId('onboarding-widget')).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-widget-add'));
    expect(mockRequestWidgetPin).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByText('Criar minha conta'));

    expect(view.getByText('FORMULÁRIO DE CADASTRO')).toBeTruthy();
    expect(view.getByText('Etapa 4 de 4')).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(4);

    await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
    expect(view.queryByText('FORMULÁRIO DE CADASTRO')).toBeNull();
    expect(view.getByText('Criar minha conta')).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(4);

    await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
    expect(view.getByTestId('onboarding-widget')).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(3);
    await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
    expect(view.getByText('Qual é a sua meta diária?')).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(2);

    await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
    expect(view.getByRole('progressbar').props.accessibilityValue.now).toBe(1);
    expect(view.getByRole('button', {name: 'Voltar'})).toBeTruthy();
  });

  it('returns to the previous step on a right swipe from the left edge', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    const view = await render(<WelcomeScreen />);
    await fireEvent.press(view.getByTestId('welcome-new-account'));

    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    expect(view.getByText('Qual é a sua meta diária?')).toBeTruthy();

    await fireEvent(view.getByTestId('onboarding-scroll'), 'touchStart', {nativeEvent: {pageX: 12, pageY: 220}});
    await fireEvent(view.getByTestId('onboarding-scroll'), 'touchEnd', {nativeEvent: {pageX: 110, pageY: 225}});

    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });
  it('asks first and opens login directly for an existing account', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    const view = await render(<WelcomeScreen />);
    expect(view.getByText('Você já tem uma conta?')).toBeTruthy();
    expect(view.queryByRole('progressbar')).toBeNull();
    await fireEvent.press(view.getByTestId('welcome-existing-account'));
    expect(view.getByText('FORMULÁRIO DE LOGIN')).toBeTruthy();
    expect(view.queryByRole('progressbar')).toBeNull();
    expect(mockSelectDailyGoal).not.toHaveBeenCalled();
    expect(mockOnboardingState.clearSelectedDailyGoal).toHaveBeenCalledTimes(1);
    expect(mockRequestWidgetPin).not.toHaveBeenCalled();
  });

  it('continues after the native instructions on unsupported devices without a separate skip button', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    mockRequestWidgetPin.mockResolvedValue(false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const view = await render(<WelcomeScreen />);
    await fireEvent.press(view.getByTestId('welcome-new-account'));
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByTestId('onboarding-widget-add'));
    expect(alert).toHaveBeenCalled();
    expect(view.getByTestId('onboarding-widget')).toBeTruthy();
    expect(view.queryByTestId('onboarding-widget-skip')).toBeNull();
    await act(() => alert.mock.calls[0][2]![0].onPress?.());
    expect(view.getByText('Etapa 4 de 4')).toBeTruthy();
    alert.mockRestore();
  });

  it('keeps the widget step available when the native request fails', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    mockRequestWidgetPin.mockRejectedValue(new Error('Launcher unavailable'));
    const view = await render(<WelcomeScreen />);
    await fireEvent.press(view.getByTestId('welcome-new-account'));
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByTestId('onboarding-widget-add'));
    expect(view.getByRole('alert')).toHaveTextContent('Não foi possível abrir o widget. Tente novamente.');
    expect(view.getByTestId('onboarding-widget-add')).toBeEnabled();
    mockRequestWidgetPin.mockResolvedValue(true);
    await fireEvent.press(view.getByTestId('onboarding-widget-add'));
    expect(view.getByText('Etapa 4 de 4')).toBeTruthy();
  });

});
