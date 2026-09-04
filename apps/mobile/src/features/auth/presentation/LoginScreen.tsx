import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField} from './AuthScaffold';

interface LoginFormProps {
  initialEmail?: string;
  onAuthenticated?: () => void;
  onCreateAccount?: () => void;
}

export function LoginForm({initialEmail = '', onAuthenticated, onCreateAccount}: LoginFormProps): React.JSX.Element {
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
        label={copy.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <AuthField
        label={copy.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <AuthButton label={copy.signIn} onPress={submit} loading={loading} disabled={!email || !password} />

      {onCreateAccount ? (
        <Pressable accessibilityRole="button" onPress={onCreateAccount} style={({pressed}) => [styles.linkButton, pressed && styles.linkPressed]}>
          <Text style={styles.link}>{copy.noAccount}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  error: {color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
  linkButton: {minHeight: 45, alignItems: 'center', justifyContent: 'center'},
  link: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  linkPressed: {opacity: 0.75},
});
