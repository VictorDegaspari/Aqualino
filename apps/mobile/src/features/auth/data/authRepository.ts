import type {User} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';
import type {AppLocale} from '../../../shared/i18n/appLocale';

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
  locale: AppLocale;
  daily_goal_ml: number;
  onboarding_completed: true;
  terms_accepted: true;
  terms_version: string;
  device_name: string;
}

export interface UsernameAvailability {
  valid: boolean;
  available: boolean;
}

export interface PasswordResetInput {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export const authRepository = {
  forgotPassword(email: string): Promise<{message: string; retry_after: number}> {
    return apiRequest('/auth/forgot-password', {
      method: 'POST', body: {email}, authenticated: false, timeoutMs: 12_000,
    });
  },

  resetPassword(input: PasswordResetInput): Promise<{message: string}> {
    return apiRequest('/auth/reset-password', {
      method: 'POST', body: input, authenticated: false, timeoutMs: 12_000,
    });
  },

  resendVerification(): Promise<{email_verified_at: string | null; retry_after: number}> {
    return apiRequest('/auth/email/verification-notification', {method: 'POST', timeoutMs: 12_000});
  },

  usernameAvailability(username: string): Promise<UsernameAvailability> {
    return apiRequest<UsernameAvailability>(`/auth/username-availability?username=${encodeURIComponent(username)}`, {
      authenticated: false,
      timeoutMs: 5_000,
    });
  },

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
    return apiRequest<User>('/me', {timeoutMs: 5_000});
  },

  updateProfile(input: Partial<{
    timezone: string;
    locale: AppLocale;
    favorite_volumes_ml: number[];
    onboarding_completed: boolean;
    avatar_url: string;
  }>): Promise<User['profile']> {
    return apiRequest<User['profile']>('/me/profile', {method: 'PATCH', body: input});
  },

  logout(): Promise<void> {
    return apiRequest('/auth/logout', {method: 'POST'}).then(() => undefined);
  },
};
