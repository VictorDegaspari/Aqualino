import React, {useState} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {StyleSheet, Text} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy} from '../../../shared/i18n/appLocale';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField} from './AuthScaffold';
import {accountSecurityCopy} from './accountSecurityCopy';
import {SecurityLink} from './AccountSecurityParts';

interface LoginFormProps {
  initialEmail?: string;
  onAuthenticated?: () => void;
  onCreateAccount?: () => void;
  onForgotPassword?: (email: string) => void;
}

export function LoginForm({initialEmail = '', onAuthenticated, onCreateAccount, onForgotPassword}: LoginFormProps): React.JSX.Element {
  const authenticate = useSessionStore(state => state.authenticate);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const clearSelectedDailyGoal = useOnboardingPreferencesStore(state => state.clearSelectedDailyGoal);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const copy = appCopy[locale].auth;

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await authRepository.login(email, password);
      await authenticate(result);
      if (result.user.profile.onboarding_completed_at) clearSelectedDailyGoal();
      if (result.user.profile.locale !== locale) {
        authRepository.updateProfile({locale})
          .then(() => refreshUser())
          .catch(() => undefined);
      }
      onAuthenticated?.();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : copy.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthField
        testID="login-email"
        label={copy.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <AuthField
        testID="login-password"
        label={copy.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {onForgotPassword ? <SecurityLink variant="text" label={accountSecurityCopy[locale].forgotLink}
        onPress={() => onForgotPassword(email.trim().toLowerCase())} disabled={loading} /> : null}
      <AuthButton testID="login-submit" label={copy.signIn} onPress={submit} loading={loading} disabled={!email || !password} />

      {onCreateAccount ? (
        <RaisedButton onPress={onCreateAccount} label={copy.noAccount} variant="outlined" tone="aqua" />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  error: {fontFamily: typography.family, color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
});
