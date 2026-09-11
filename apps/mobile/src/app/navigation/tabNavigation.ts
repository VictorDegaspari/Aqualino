import {DarkTheme} from '@react-navigation/native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';

// Cover the interval before a newly mounted tab paints its own background.
export const appNavigationTheme = {
  ...DarkTheme,
  colors: {...DarkTheme.colors, background: challengeTheme.colors.background},
};

export const tabScreenOptions = {
  headerShown: false,
  animation: 'none',
  gestureEnabled: false,
  contentStyle: {backgroundColor: challengeTheme.colors.background},
} as const;
