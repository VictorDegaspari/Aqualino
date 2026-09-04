import {appCopy, localeOptions, normalizeAppLocale} from './appLocale';

test('exposes the supported app languages with their country flags', () => {
  expect(localeOptions).toEqual([
    {value: 'pt-BR', flag: '🇧🇷', label: 'Português', country: 'Brasil'},
    {value: 'en-US', flag: '🇺🇸', label: 'English', country: 'United States'},
  ]);
});

test('uses Brazilian Portuguese when a persisted locale is unsupported', () => {
  expect(normalizeAppLocale('en-US')).toBe('en-US');
  expect(normalizeAppLocale('es-ES')).toBe('pt-BR');
  expect(appCopy['en-US'].auth.signIn).toBe('Sign in');
});
