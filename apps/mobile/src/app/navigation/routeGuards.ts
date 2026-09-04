export type SessionRouteStatus = 'booting' | 'signedOut' | 'signedIn';

export function quickHydrationRedirectForSession(
  status: SessionRouteStatus,
  onboardingCompleted: boolean,
): 'Welcome' | 'Onboarding' | undefined {
  if (status === 'signedOut') return 'Welcome';
  if (status === 'signedIn' && !onboardingCompleted) return 'Onboarding';
  return undefined;
}
