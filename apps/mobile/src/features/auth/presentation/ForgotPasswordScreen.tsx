import React, {useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppError} from '../../../shared/errors/AppError';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField, AuthScaffold} from './AuthScaffold';
import {accountSecurityCopy} from './accountSecurityCopy';
import {SecurityEmail, SecurityLink, SecurityNotice, securityError, useResendCooldown, validSecurityEmail} from './AccountSecurityParts';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({navigation, route}: Props): React.JSX.Element {
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const copy = accountSecurityCopy[locale];
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const cooldown = useResendCooldown();

  const submit = async () => {
    if (inFlight.current || cooldown.remaining > 0) return;
    const normalized = email.trim().toLowerCase();
    if (!validSecurityEmail(normalized)) {setError(copy.emailInvalid); return;}
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await authRepository.forgotPassword(normalized);
      setSentTo(normalized);
      cooldown.start(result.retry_after);
    } catch (cause) {
      setError(securityError(cause, copy));
      if (cause instanceof AppError && cause.status === 429) cooldown.start(60);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return <AuthScaffold eyebrow={copy.eyebrow} title={sentTo ? copy.sentTitle : copy.forgotTitle}
    subtitle={sentTo ? copy.sentSubtitle : copy.forgotSubtitle}>
    {sentTo ? <><SecurityEmail email={sentTo} /><SecurityNotice message={copy.sentHint} /></> : (
      <AuthField label={copy.email} placeholder={copy.emailPlaceholder} value={email} onChangeText={setEmail}
        autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address"
        editable={!busy} maxLength={255} returnKeyType="send" onSubmitEditing={submit} />
    )}
    <SecurityNotice message={error} error />
    <AuthButton label={cooldown.remaining > 0 ? copy.resendIn(cooldown.remaining) : sentTo ? copy.resend : copy.sendLink}
      onPress={submit} loading={busy} disabled={cooldown.remaining > 0 || !email.trim()} />
    {sentTo ? <SecurityLink label={copy.changeEmail} disabled={busy} onPress={() => {setSentTo(undefined); setError(undefined);}} /> : null}
    <SecurityLink label={copy.backToLogin} disabled={busy}
      onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn', {email})} />
  </AuthScaffold>;
}
