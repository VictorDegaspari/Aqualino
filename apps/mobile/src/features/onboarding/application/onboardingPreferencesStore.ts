import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';
import {normalizeAppLocale, type AppLocale} from '../../../shared/i18n/appLocale';

const storage = createMMKV({id: 'aqualino.onboarding'});
const welcomeCompletedKey = 'onboarding.welcomeCompleted';
const localeKey = 'onboarding.locale';
const dailyGoalMlKey = 'onboarding.dailyGoalMl';

const storedDailyGoalMl = storage.getNumber(dailyGoalMlKey);
const initialDailyGoalMl = typeof storedDailyGoalMl === 'number' && Number.isFinite(storedDailyGoalMl) && storedDailyGoalMl >= 500 && storedDailyGoalMl <= 10000
  ? storedDailyGoalMl
  : 2000;

interface OnboardingPreferencesState {
  hasCompletedWelcome: boolean;
  locale: AppLocale;
  dailyGoalMl: number;
  hasSelectedDailyGoal: boolean;
  completeWelcome: () => void;
  restartWelcome: () => void;
  selectLocale: (locale: AppLocale) => void;
  selectDailyGoal: (goalMl: number) => void;
  clearSelectedDailyGoal: () => void;
}

export const useOnboardingPreferencesStore = create<OnboardingPreferencesState>(set => ({
  hasCompletedWelcome: storage.getBoolean(welcomeCompletedKey) ?? false,
  locale: normalizeAppLocale(storage.getString(localeKey)),
  dailyGoalMl: initialDailyGoalMl,
  hasSelectedDailyGoal: storage.contains(dailyGoalMlKey),
  completeWelcome() {
    storage.set(welcomeCompletedKey, true);
    set({hasCompletedWelcome: true});
  },
  restartWelcome() {
    storage.set(welcomeCompletedKey, false);
    storage.remove(dailyGoalMlKey);
    set({hasCompletedWelcome: false, dailyGoalMl: 2000, hasSelectedDailyGoal: false});
  },
  selectLocale(locale) {
    storage.set(localeKey, locale);
    set({locale});
  },
  selectDailyGoal(goalMl) {
    storage.set(dailyGoalMlKey, goalMl);
    set({dailyGoalMl: goalMl, hasSelectedDailyGoal: true});
  },
  clearSelectedDailyGoal() {
    storage.remove(dailyGoalMlKey);
    set({dailyGoalMl: 2000, hasSelectedDailyGoal: false});
  },
}));
