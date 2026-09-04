import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField} from './AuthScaffold';

interface RegisterFormProps {
  onAuthenticated?: () => void;
  onLogin?: () => void;
}

export function RegisterForm({onAuthenticated, onLogin}: RegisterFormProps): React.JSX.Element {
  const authenticate = useSessionStore(state => state.authenticate);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const copy = appCopy[locale].auth;

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await authRepository.register({
        email,
        password,
        password_confirmation: password,
        display_name: displayName,
        username,
        timezone: 'America/Sao_Paulo',
        locale,
        terms_accepted: true,
        terms_version: '2026-09-02',
        device_name: 'Aqualino Mobile',
      });
      await authenticate(result);
      onAuthenticated?.();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : copy.registerError);
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
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder={copy.usernamePlaceholder}
      />
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
        disabled={!displayName || !username || !email || password.length < 8 || !terms}
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
  termsText: {flex: 1, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  error: {color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
  linkButton: {minHeight: 45, alignItems: 'center', justifyContent: 'center'},
  link: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  linkPressed: {opacity: 0.75},
});
