export type SessionRouteStatus = 'booting' | 'signedOut' | 'signedIn';

export function quickHydrationRedirectForSession(
  status: SessionRouteStatus,
  onboardingCompleted: boolean,
  verificationRequired = false,
): 'Welcome' | 'Onboarding' | 'VerifyEmail' | undefined {
  if (status === 'signedOut') return 'Welcome';
  if (status === 'signedIn' && verificationRequired) return 'VerifyEmail';
  if (status === 'signedIn' && !onboardingCompleted) return 'Onboarding';
  return undefined;
}
