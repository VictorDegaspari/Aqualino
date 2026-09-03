import type {User} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export interface AuthResult {
  token: string;
  token_type: 'Bearer';
  user: User;
}

export interface RegistrationInput {
  email: string;
  password: string;
  password_confirmation: string;
  display_name: string;
  username: string;
  timezone: string;
  terms_accepted: true;
  terms_version: string;
  device_name: string;
}

export const authRepository = {
  register(input: RegistrationInput): Promise<AuthResult> {
    return apiRequest<AuthResult>('/auth/register', {method: 'POST', body: input, authenticated: false});
  },

  login(email: string, password: string): Promise<AuthResult> {
    return apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: {email, password, device_name: 'Aqualino Mobile'},
      authenticated: false,
    });
  },

  me(): Promise<User> {
    return apiRequest<User>('/me');
  },

  updateProfile(input: {
    timezone: string;
    favorite_volumes_ml: number[];
    onboarding_completed: boolean;
  }): Promise<User['profile']> {
    return apiRequest<User['profile']>('/me/profile', {method: 'PATCH', body: input});
  },

  logout(): Promise<void> {
    return apiRequest('/auth/logout', {method: 'POST'}).then(() => undefined);
  },
};

