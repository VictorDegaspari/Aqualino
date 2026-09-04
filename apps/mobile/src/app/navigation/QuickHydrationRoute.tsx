import React, {useEffect} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSessionStore} from '../../features/auth/application/sessionStore';
import {QuickHydrationScreen} from '../../features/hydration/presentation/QuickHydrationScreen';
import {AppLoadingScreen} from '../presentation/AppLoadingScreen';
import type {RootStackParamList} from './AppNavigation';
import {quickHydrationRedirectForSession} from './routeGuards';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickHydration'>;

export function QuickHydrationRoute(props: Props): React.JSX.Element {
  const status = useSessionStore(state => state.status);
  const onboardingCompleted = useSessionStore(state => Boolean(state.user?.profile.onboarding_completed_at));
  const redirect = quickHydrationRedirectForSession(status, onboardingCompleted);

  useEffect(() => {
    if (redirect) props.navigation.replace(redirect);
  }, [props.navigation, redirect]);

  return redirect || status === 'booting'
    ? <AppLoadingScreen />
    : <QuickHydrationScreen {...props} />;
}
