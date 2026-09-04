import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {WelcomeScreen} from '../presentation/WelcomeScreen';

const mockRestartWelcome = jest.fn();
const mockCompleteWelcome = jest.fn();
const mockSelectLocale = jest.fn();
const mockSelectDailyGoal = jest.fn();

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

jest.mock('../../auth/presentation/LoginScreen', () => {
  const ReactModule = require('react');
  const {Text} = require('react-native');
  return {LoginForm: () => ReactModule.createElement(Text, null, 'FORMULÁRIO DE LOGIN')};
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
  });

  it('shows remembered accounts after logout and keeps login inside the third step', async () => {
    const view = await render(<WelcomeScreen />);

    expect(view.getByText('Ana')).toBeTruthy();
    expect(view.getByText('ana@example.com')).toBeTruthy();
    expect(view.getByText('Etapa 3 de 3')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', {name: 'Continuar como Ana'}));

    expect(view.getByText('FORMULÁRIO DE LOGIN')).toBeTruthy();
    expect(view.getByText('Etapa 3 de 3')).toBeTruthy();
  });

  it('restarts onboarding when a new account is added', async () => {
    const view = await render(<WelcomeScreen />);

    await fireEvent.press(view.getByText('Adicionar nova conta'));

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
});
