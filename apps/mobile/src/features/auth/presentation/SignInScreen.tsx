import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {requiresEmailVerification} from '../application/emailVerification';
import {useSessionStore} from '../application/sessionStore';
import {AuthScaffold} from './AuthScaffold';
import {accountSecurityCopy} from './accountSecurityCopy';
import {SecurityLink} from './AccountSecurityParts';
import {LoginForm} from './LoginScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export function SignInScreen({navigation, route}: Props): React.JSX.Element {
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const copy = accountSecurityCopy[locale];
  const user = useSessionStore(state => state.user);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    if (!authenticated || !user) return;
    const name = requiresEmailVerification(user) ? 'VerifyEmail' : user.profile.onboarding_completed_at ? 'Home' : 'Onboarding';
    navigation.reset({index: 0, routes: [{name}]});
  }, [authenticated, navigation, user]);

  return <AuthScaffold eyebrow={copy.eyebrow} title={copy.loginTitle} subtitle={copy.loginSubtitle}>
    <LoginForm initialEmail={route.params?.email} onAuthenticated={() => setAuthenticated(true)}
      onForgotPassword={email => navigation.navigate('ForgotPassword', {email})} />
    <SecurityLink label={copy.back} onPress={() => {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.reset({index: 0, routes: [{name: user ? requiresEmailVerification(user) ? 'VerifyEmail' : user.profile.onboarding_completed_at ? 'Home' : 'Onboarding' : 'Welcome'}]});
    }} />
  </AuthScaffold>;
}
