import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {RegisterForm} from '../presentation/RegisterScreen';
import {authRepository} from '../data/authRepository';

const mockAuthenticate = jest.fn();
const mockOnboardingState = {locale: 'pt-BR' as const, dailyGoalMl: 2_400};

jest.mock('../application/sessionStore', () => ({
  useSessionStore: jest.fn((selector: (state: {authenticate: typeof mockAuthenticate}) => unknown) => selector({
    authenticate: mockAuthenticate,
  })),
}));

jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({
  useOnboardingPreferencesStore: jest.fn((selector: (state: typeof mockOnboardingState) => unknown) => selector(mockOnboardingState)),
}));

jest.mock('../data/authRepository', () => ({
  authRepository: {
    usernameAvailability: jest.fn(),
    register: jest.fn(),
  },
}));

const repository = authRepository as jest.Mocked<typeof authRepository>;

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('informs when the chosen nickname is already unavailable', async () => {
    repository.usernameAvailability.mockResolvedValue({valid: true, available: false});
    const view = await render(<RegisterForm />);

    await fireEvent.changeText(view.getByLabelText('Nome de usuário'), 'ana_azul');

    await waitFor(() => {
      expect(repository.usernameAvailability).toHaveBeenCalledWith('ana_azul');
    });

    expect(view.getByText('Este @ já está indisponível.')).toBeTruthy();
  });
});
