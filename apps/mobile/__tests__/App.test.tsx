/**
 * @format
 */

import {linking} from '../src/app/navigation/linking';
import {quickHydrationRedirectForSession} from '../src/app/navigation/routeGuards';

test('maps the widget deep link to quick hydration', () => {
  expect(linking.prefixes).toContain('aqualino://');
  expect(linking.config.screens.QuickHydration).toBe('hydrate/quick');
  expect(linking.config.screens.Reminders).toBe('reminders');
});

test('guards the widget hydration route without removing it from the navigator', () => {
  expect(quickHydrationRedirectForSession('signedOut', false)).toBe('Welcome');
  expect(quickHydrationRedirectForSession('signedIn', false)).toBe('Onboarding');
  expect(quickHydrationRedirectForSession('signedIn', true)).toBeUndefined();
});
