import {appCopy, localeOptions, normalizeAppLocale} from './appLocale';

test('exposes the supported app languages with their country flags', () => {
  expect(localeOptions).toEqual([
    {value: 'pt-BR', flag: '🇧🇷', label: 'Português', country: 'Brasil'},
    {value: 'en-US', flag: '🇺🇸', label: 'English', country: 'United States'},
    {value: 'es-ES', flag: '🇪🇸', label: 'Español', country: 'España'},
  ]);
});

test('uses Brazilian Portuguese when a persisted locale is unsupported', () => {
  expect(normalizeAppLocale('en-US')).toBe('en-US');
  expect(normalizeAppLocale('es-ES')).toBe('es-ES');
  expect(normalizeAppLocale('fr-FR')).toBe('pt-BR');
  expect(appCopy['en-US'].auth.signIn).toBe('Sign in');
});

test.each([
  ['es-MX', 'es-ES'], ['es_AR', 'es-ES'], ['es', 'es-ES'],
  ['en-GB', 'en-US'], ['pt-PT', 'pt-BR'], ['ES-es', 'es-ES'],
])('maps phone language %s to %s', (phone, expected) => {
  expect(normalizeAppLocale(phone)).toBe(expected);
});

test('uses the device fallback only without a supported saved choice', () => {
  expect(normalizeAppLocale(undefined, 'es-ES')).toBe('es-ES');
  expect(normalizeAppLocale('fr-FR', 'es-ES')).toBe('es-ES');
  expect(normalizeAppLocale('pt-BR', 'es-ES')).toBe('pt-BR');
  expect(appCopy['es-ES'].auth.signIn).toBe('Iniciar sesión');
});
