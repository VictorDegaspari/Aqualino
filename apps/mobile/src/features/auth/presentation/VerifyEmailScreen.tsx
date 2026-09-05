import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {requiresEmailVerification} from '../application/emailVerification';
import {useSessionStore} from '../application/sessionStore';
import {authRepository} from '../data/authRepository';
import {AuthButton, AuthScaffold} from './AuthScaffold';
import {accountSecurityCopy} from './accountSecurityCopy';
import {SecurityEmail, SecurityLink, SecurityNotice, securityError, useResendCooldown} from './AccountSecurityParts';

export function VerifyEmailScreen(): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const signOut = useSessionStore(state => state.signOut);
  const preference = useOnboardingPreferencesStore(state => state.locale);
  const locale = user?.profile.locale === 'en-US' ? 'en-US' : user?.profile.locale === 'pt-BR' ? 'pt-BR' : preference;
  const copy = accountSecurityCopy[locale];
  const [busy, setBusy] = useState<'check' | 'resend' | 'exit'>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);
  const cooldown = useResendCooldown(60);

  const check = useCallback(async (showPending = true) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy('check');
    setError(undefined);
    setMessage(undefined);
    try {
      await refreshUser();
      if (showPending && requiresEmailVerification(useSessionStore.getState().user)) setMessage(copy.verifyPending);
    } catch (cause) {
      setError(securityError(cause, copy));
    } finally {
      inFlight.current = false;
      setBusy(undefined);
    }
  }, [copy, refreshUser]);

  useEffect(() => {
    check(false);
    const subscription = AppState.addEventListener('change', state => {if (state === 'active') check(false);});
    return () => subscription.remove();
  }, [check]);

  const resend = async () => {
    if (inFlight.current || cooldown.remaining > 0) return;
    inFlight.current = true;
    setBusy('resend');
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await authRepository.resendVerification();
      cooldown.start(result.retry_after);
      if (result.email_verified_at) await refreshUser();
      else setMessage(copy.verifyResent);
    } catch (cause) {
      setError(securityError(cause, copy));
      if (cause instanceof AppError && cause.status === 429) cooldown.start(60);
    } finally {
      inFlight.current = false;
      setBusy(undefined);
    }
  };

  const exit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy('exit');
    try {await signOut();} catch (cause) {setError(securityError(cause, copy));}
    finally {inFlight.current = false; setBusy(undefined);}
  };

  return <AuthScaffold eyebrow={copy.eyebrow} title={copy.verifyTitle} subtitle={copy.verifySubtitle}>
    <SecurityEmail email={user?.email ?? ''} />
    <SecurityNotice message={copy.verifyHint} />
    <SecurityNotice message={message} />
    <SecurityNotice message={error} error />
    <AuthButton label={copy.verifyCheck} onPress={() => check()} loading={busy === 'check'} disabled={Boolean(busy)} />
    <SecurityLink label={cooldown.remaining > 0 ? copy.resendIn(cooldown.remaining) : copy.resend}
      onPress={resend} disabled={Boolean(busy) || cooldown.remaining > 0} />
    <SecurityLink label={copy.useAnotherAccount} onPress={exit} disabled={Boolean(busy)} />
  </AuthScaffold>;
}
