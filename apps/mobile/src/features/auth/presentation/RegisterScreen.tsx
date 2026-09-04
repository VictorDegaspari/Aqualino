import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy} from '../../../shared/i18n/appLocale';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField} from './AuthScaffold';

interface RegisterFormProps {
  onAuthenticated?: () => void;
  onLogin?: () => void;
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'unavailable';

export function RegisterForm({onAuthenticated, onLogin}: RegisterFormProps): React.JSX.Element {
  const authenticate = useSessionStore(state => state.authenticate);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const dailyGoalMl = useOnboardingPreferencesStore(state => state.dailyGoalMl);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [usernameError, setUsernameError] = useState<string>();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [loading, setLoading] = useState(false);
  const copy = appCopy[locale].auth;
  const normalizedUsername = username.trim().toLowerCase();
  const canCheckUsername = USERNAME_PATTERN.test(normalizedUsername);

  useEffect(() => {
    if (!canCheckUsername) {
      setUsernameStatus('idle');
      return;
    }

    let isCurrent = true;
    setUsernameStatus('checking');
    const timeout = setTimeout(() => {
      authRepository.usernameAvailability(normalizedUsername)
        .then(({available}) => {
          if (isCurrent) setUsernameStatus(available ? 'available' : 'unavailable');
        })
        .catch(() => {
          if (isCurrent) setUsernameStatus('idle');
        });
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [canCheckUsername, normalizedUsername]);

  const updateUsername = (value: string) => {
    setUsername(value.toLowerCase());
    setUsernameError(undefined);
  };

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    setUsernameError(undefined);
    try {
      const result = await authRepository.register({
        email,
        password,
        password_confirmation: password,
        display_name: displayName,
        username,
        timezone: 'America/Sao_Paulo',
        locale,
        daily_goal_ml: dailyGoalMl,
        onboarding_completed: true,
        terms_accepted: true,
        terms_version: '2026-09-02',
        device_name: 'Aqualino Mobile',
      });
      await authenticate(result);
      onAuthenticated?.();
    } catch (cause) {
      if (cause instanceof AppError && cause.fields.username?.length) {
        setUsernameStatus('unavailable');
        setUsernameError(copy.usernameUnavailable);
      } else {
        setError(cause instanceof AppError ? cause.message : copy.registerError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthField label={copy.displayName} value={displayName} onChangeText={setDisplayName} />
      <AuthField
        label={copy.username}
        value={username}
        onChangeText={updateUsername}
        autoCapitalize="none"
        placeholder={copy.usernamePlaceholder}
      />
      {usernameStatus === 'checking' ? <Text accessibilityLiveRegion="polite" style={styles.usernameChecking}>{copy.checkingUsername}</Text> : null}
      {usernameStatus === 'available' ? <Text accessibilityLiveRegion="polite" style={styles.usernameAvailable}>{copy.usernameAvailable}</Text> : null}
      {usernameStatus === 'unavailable' || usernameError ? (
        <Text accessibilityRole="alert" style={styles.usernameUnavailable}>{usernameError ?? copy.usernameUnavailable}</Text>
      ) : null}
      <AuthField
        label={copy.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AuthField
        label={copy.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={copy.passwordPlaceholder}
      />

      <View style={styles.terms}>
        <Switch
          accessibilityLabel={copy.terms}
          value={terms}
          onValueChange={setTerms}
          trackColor={{false: challengeTheme.colors.border, true: challengeTheme.colors.cyanStrong}}
          thumbColor={terms ? challengeTheme.colors.backgroundDeep : '#D6F6FF'}
        />
        <Text style={styles.termsText}>{copy.terms}</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <AuthButton
        label={copy.createAccount}
        onPress={submit}
        loading={loading}
        disabled={!displayName || !canCheckUsername || !email || password.length < 8 || !terms || usernameStatus === 'checking' || usernameStatus === 'unavailable'}
      />
      {onLogin ? (
        <Pressable accessibilityRole="button" onPress={onLogin} style={({pressed}) => [styles.linkButton, pressed && styles.linkPressed]}>
          <Text style={styles.link}>{copy.signIn}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  terms: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  termsText: {fontFamily: typography.family, flex: 1, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  error: {fontFamily: typography.family, color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
  usernameChecking: {fontFamily: typography.family, marginTop: -7, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  usernameAvailable: {fontFamily: typography.family, marginTop: -7, fontSize: 12, lineHeight: 17, color: '#8EE6C1', fontWeight: '700'},
  usernameUnavailable: {fontFamily: typography.family, marginTop: -7, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.danger, fontWeight: '700'},
  linkButton: {minHeight: 45, alignItems: 'center', justifyContent: 'center'},
  link: {fontFamily: typography.family, fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  linkPressed: {opacity: 0.75},
});
