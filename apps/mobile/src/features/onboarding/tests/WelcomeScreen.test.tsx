import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {AppError} from '../../../shared/errors/AppError';
import {WelcomeScreen} from '../presentation/WelcomeScreen';

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
    mockOnboardingState.hasCompletedWelcome = true;
    mockResumeRememberedAccount.mockResolvedValue(false);
  });

  it('shows remembered accounts after logout outside of the onboarding steps', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('ana@example.com')).toBeTruthy();
    expect(view.queryByText('Etapa 3 de 3')).toBeNull();

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(view.getByText('FORMULÁRIO DE LOGIN')).toBeTruthy();
    expect(view.queryByText('Etapa 3 de 3')).toBeNull();
  });

  it('resumes a saved account without asking for a password', async () => {
    mockResumeRememberedAccount.mockResolvedValue(true);
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(mockResumeRememberedAccount).toHaveBeenCalledWith('user-1');
    expect(view.queryByText('FORMULÁRIO DE LOGIN')).toBeNull();
  });

  it('keeps the saved account and explains when it is offline', async () => {
    mockResumeRememberedAccount.mockRejectedValue(new AppError('Sem conexão', 'NETWORK_UNAVAILABLE'));
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('Você não está conectado à internet. Verifique sua conexão e tente novamente.')).toBeTruthy();
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
    expect(view.getByText('Etapa 1 de 3')).toBeTruthy();
    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });

  it('restarts onboarding when registration is chosen from login', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));
    await fireEvent.press(view.getByRole('button', {name: 'Criar uma nova conta'}));

    expect(mockRestartWelcome).toHaveBeenCalledTimes(1);
    expect(view.getByText('Etapa 1 de 3')).toBeTruthy();
    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });

  it('opens registration inside the final step on first access', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    await fireEvent.press(view.getByText('Criar minha conta'));

    expect(view.getByText('FORMULÁRIO DE CADASTRO')).toBeTruthy();
    expect(view.getByText('Etapa 3 de 3')).toBeTruthy();
  });

  it('returns to the previous step on a right swipe from the left edge', async () => {
    mockOnboardingState.hasCompletedWelcome = false;
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
    expect(view.getByText('Qual é a sua meta diária?')).toBeTruthy();

    await fireEvent(view.getByTestId('onboarding-scroll'), 'touchStart', {nativeEvent: {pageX: 12, pageY: 220}});
    await fireEvent(view.getByTestId('onboarding-scroll'), 'touchEnd', {nativeEvent: {pageX: 110, pageY: 225}});

    expect(view.getByText('Escolha o idioma do app')).toBeTruthy();
  });
});
