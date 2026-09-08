import {NativeModules, Platform} from 'react-native';
import {normalizeAppLocale, type AppLocale} from './appLocale';

export function getDeviceLocale(): AppLocale {
  const settings = NativeModules.SettingsManager?.settings;
  const nativeLocale: string | undefined = Platform.OS === 'ios'
    ? settings?.AppleLanguages?.[0] ?? settings?.AppleLocale
    : NativeModules.I18nManager?.localeIdentifier;
  if (nativeLocale) return normalizeAppLocale(nativeLocale);

  try {
    return normalizeAppLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'pt-BR';
  }
}
