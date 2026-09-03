import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {tokens} from '@aqualino/design-tokens';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppError} from '../../../shared/errors/AppError';
import {FormField} from '../../../shared/components/FormField';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {Screen} from '../../../shared/components/Screen';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props): React.JSX.Element {
  const authenticate = useSessionStore(state => state.authenticate);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await authenticate(await authRepository.login(email, password));
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>Aqualino</Text>
      <Text style={styles.subtitle}>Seu hábito de hidratação, uma gota por vez.</Text>
      <FormField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" autoComplete="email" />
      <FormField label="Senha" value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="current-password" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Entrar" onPress={submit} loading={loading}
        disabled={!email || !password} />
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
        <Text style={styles.link}>Ainda não tenho conta</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {flexGrow: 1, justifyContent: 'center', padding: tokens.spacing.lg, gap: tokens.spacing.md},
  title: {fontSize: 42, fontWeight: '800', color: tokens.color.primaryStrong, textAlign: 'center'},
  subtitle: {fontSize: tokens.fontSize.md, color: tokens.color.textMuted, textAlign: 'center', marginBottom: 16},
  error: {color: tokens.color.danger, textAlign: 'center'},
  linkButton: {minHeight: 48, alignItems: 'center', justifyContent: 'center'},
  link: {color: tokens.color.primary, fontWeight: '700'},
});
