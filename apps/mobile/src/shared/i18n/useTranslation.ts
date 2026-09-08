import {useCallback} from 'react';
import {useOnboardingPreferencesStore} from '../../features/onboarding/application/onboardingPreferencesStore';
import type {AppLocale} from './appLocale';

export function translate(locale: AppLocale, portuguese: string, english: string, spanish: string): string {
  return locale === 'es-ES' ? spanish : locale === 'en-US' ? english : portuguese;
}

export function useTranslation(override?: AppLocale) {
  const preference = useOnboardingPreferencesStore(state => state.locale);
  const locale = override ?? preference;
  const t = useCallback((portuguese: string, english: string, spanish: string) =>
    translate(locale, portuguese, english, spanish), [locale]);
  return {locale, t};
}
