/**
 * @format
 */

import {linking} from '../src/app/navigation/linking';
import {quickHydrationRedirectForSession} from '../src/app/navigation/routeGuards';
import {requiresEmailVerification} from '../src/features/auth/application/emailVerification';
import type {User} from '@aqualino/contracts';

test('maps the widget deep link to the home screen', () => {
  expect(linking.prefixes).toContain('aqualino://');
  expect(linking.config.screens.Home).toBe('home');
  expect(linking.config.screens.QuickHydration).toBe('hydrate/quick');
  expect(linking.config.screens.Reminders).toBe('reminders');
});

test('guards the quick hydration route without removing it from the navigator', () => {
  expect(quickHydrationRedirectForSession('signedOut', false)).toBe('Welcome');
  expect(quickHydrationRedirectForSession('signedIn', false)).toBe('Onboarding');
  expect(quickHydrationRedirectForSession('signedIn', true)).toBeUndefined();
  expect(quickHydrationRedirectForSession('signedIn', true, true)).toBe('VerifyEmail');
  expect(quickHydrationRedirectForSession('signedIn', false, true)).toBe('VerifyEmail');
});

test('email actions are available as app links and verification preserves existing account compatibility', () => {
  expect(linking.config.screens.ResetPassword).toBe('auth/reset-password');
  expect(linking.config.screens.ForgotPassword).toBe('auth/forgot-password');
  expect(linking.config.screens.SignIn).toBe('auth/sign-in');
  expect(requiresEmailVerification(null)).toBe(false);
  expect(requiresEmailVerification({} as User)).toBe(false);
  expect(requiresEmailVerification({email_verification_required: true, email_verified_at: null} as User)).toBe(true);
  expect(requiresEmailVerification({email_verification_required: true, email_verified_at: '2026-09-04'} as User)).toBe(false);
});
