import React, {useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AppError} from '../../../shared/errors/AppError';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthField, AuthScaffold} from './AuthScaffold';
import {accountSecurityCopy} from './accountSecurityCopy';
import {SecurityEmail, SecurityLink, SecurityNotice, securityError, validSecurityEmail} from './AccountSecurityParts';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen(props: Props): React.JSX.Element {
  // A second incoming email link must get its own form and success/error state.
  return <ResetPasswordForm key={`${props.route.params?.email}:${props.route.params?.token}`} {...props} />;
}

function ResetPasswordForm({navigation, route}: Props): React.JSX.Element {
  const preference = useOnboardingPreferencesStore(state => state.locale);
  const locale = route.params?.locale === 'en-US' || route.params?.locale === 'pt-BR' ? route.params.locale : preference;
  const copy = accountSecurityCopy[locale];
  const clearCredentials = useSessionStore(state => state.clearPasswordResetCredentials);
  const email = typeof route.params?.email === 'string' ? route.params.email.trim().toLowerCase() : '';
  const token = typeof route.params?.token === 'string' ? route.params.token : '';
  const [invalid, setInvalid] = useState(!validSecurityEmail(email) || !/^[a-zA-Z0-9]{32,256}$/.test(token));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current || invalid || complete) return;
    if (password.length < 8 || password.length > 128 || !/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
      setError(copy.passwordInvalid); return;
    }
    if (confirmation !== password) {setError(copy.mismatch); return;}
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await authRepository.resetPassword({email, token, password, password_confirmation: confirmation});
      setPassword('');
      setConfirmation('');
      await clearCredentials(email);
      setComplete(true);
    } catch (cause) {
      if (cause instanceof AppError && cause.code === 'PASSWORD_RESET_INVALID') setInvalid(true);
      else setError(securityError(cause, copy));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return <AuthScaffold eyebrow={copy.eyebrow} title={complete ? copy.successTitle : invalid ? copy.invalidTitle : copy.resetTitle}
    subtitle={complete ? copy.successSubtitle : invalid ? copy.invalidLink : copy.resetSubtitle}>
    {complete ? <>
      <SecurityNotice message={copy.successHint} />
      <AuthButton label={copy.signIn} onPress={() => navigation.replace('SignIn', {email})} />
    </> : invalid ? (
      <AuthButton label={copy.newLink} onPress={() => navigation.replace('ForgotPassword', {email})} />
    ) : <>
      <SecurityEmail email={email} />
      <AuthField label={copy.password} value={password} onChangeText={setPassword} secureTextEntry
        autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy} />
      <AuthField label={copy.confirmPassword} value={confirmation} onChangeText={setConfirmation} secureTextEntry
        autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!busy}
        returnKeyType="done" onSubmitEditing={submit} />
      <SecurityNotice message={copy.passwordHint} />
      <SecurityNotice message={error} error />
      <AuthButton label={copy.resetButton} onPress={submit} loading={busy} disabled={!password || !confirmation} />
    </>}
    {!complete ? <SecurityLink label={copy.backToLogin} disabled={busy} onPress={() => navigation.replace('SignIn', {email})} /> : null}
  </AuthScaffold>;
}
