/**
 * @format
 */

import {linking} from '../src/app/navigation/linking';

test('maps the widget deep link to quick hydration', () => {
  expect(linking.prefixes).toContain('aqualino://');
  expect(linking.config.screens.QuickHydration).toBe('hydrate/quick');
});
