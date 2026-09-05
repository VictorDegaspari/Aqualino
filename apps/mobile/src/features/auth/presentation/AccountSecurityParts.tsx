import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import type {AccountSecurityCopy} from './accountSecurityCopy';

export function SecurityLink({label, onPress, disabled = false}: {label: string; onPress: () => void; disabled?: boolean}): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed}) => [styles.linkButton, (pressed || disabled) && styles.dimmed]}>
    <Text style={styles.link}>{label}</Text>
  </Pressable>;
}

export function SecurityNotice({message, error = false}: {message?: string; error?: boolean}): React.JSX.Element | null {
  return message ? <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={[styles.notice, error && styles.error]}>{message}</Text> : null;
}

export function SecurityEmail({email}: {email: string}): React.JSX.Element {
  return <Text selectable style={styles.email}>{email}</Text>;
}

export function useResendCooldown(initialSeconds = 0): {remaining: number; start: (seconds: number) => void} {
  const [until, setUntil] = useState(() => Date.now() + initialSeconds * 1000);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const ticking = remaining > 0;
  useEffect(() => {
    if (until <= Date.now()) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [until, ticking]);
  return {remaining, start: seconds => {const time = Date.now(); setNow(time); setUntil(time + seconds * 1000);}};
}

export function securityError(cause: unknown, copy: AccountSecurityCopy): string {
  if (cause instanceof AppError) {
    if (cause.code === 'NETWORK_UNAVAILABLE' || cause.code === 'REQUEST_TIMEOUT') return copy.networkError;
    if (cause.status === 429) return copy.rateLimit;
    if (cause.status === 401) return copy.sessionExpired;
    if (cause.code === 'EMAIL_DELIVERY_UNAVAILABLE') return copy.deliveryError;
  }
  return copy.genericError;
}

export function validSecurityEmail(email: string): boolean {
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const styles = StyleSheet.create({
  linkButton: {minHeight: 45, alignItems: 'center', justifyContent: 'center'},
  link: {fontFamily: typography.family, fontSize: 14, lineHeight: 20, fontWeight: '800', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  dimmed: {opacity: 0.45},
  notice: {fontFamily: typography.family, fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {color: challengeTheme.colors.danger},
  email: {fontFamily: typography.family, fontSize: 17, lineHeight: 24, fontWeight: '800', color: challengeTheme.colors.text, textAlign: 'center', paddingVertical: 8},
});
