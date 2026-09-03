import React, {useState} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {tokens} from '@aqualino/design-tokens';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {FormField} from '../../../shared/components/FormField';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {Screen} from '../../../shared/components/Screen';
import {AppError} from '../../../shared/errors/AppError';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen(_: Props): React.JSX.Element {
  const authenticate = useSessionStore(state => state.authenticate);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

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
        terms_accepted: true,
        terms_version: '2026-09-02',
        device_name: 'Aqualino Mobile',
      });
      await authenticate(result);
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Vamos começar</Text>
      <Text style={styles.subtitle}>Leva menos de um minuto.</Text>
      <FormField label="Como quer ser chamado?" value={displayName} onChangeText={setDisplayName} />
      <FormField label="Nome de usuário" value={username} onChangeText={setUsername}
        autoCapitalize="none" placeholder="ana_azul" />
      <FormField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none"
        keyboardType="email-address" />
      <FormField label="Senha" value={password} onChangeText={setPassword} secureTextEntry
        placeholder="8+ caracteres, letras e números" />
      <View style={styles.terms}>
        <Switch accessibilityLabel="Aceitar termos e política de privacidade" value={terms} onValueChange={setTerms} />
        <Text style={styles.termsText}>Li e aceito os Termos e a Política de Privacidade.</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Criar minha conta" onPress={submit} loading={loading}
        disabled={!displayName || !username || !email || password.length < 8 || !terms} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: tokens.fontSize.xl, fontWeight: '800', color: tokens.color.text},
  subtitle: {fontSize: tokens.fontSize.md, color: tokens.color.textMuted},
  terms: {flexDirection: 'row', gap: tokens.spacing.sm, alignItems: 'center'},
  termsText: {flex: 1, color: tokens.color.text, lineHeight: 22},
  error: {color: tokens.color.danger},
});
