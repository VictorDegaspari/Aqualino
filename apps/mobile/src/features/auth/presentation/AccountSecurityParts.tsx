import React, {useEffect, useState} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {Pressable, StyleSheet, Text} from 'react-native';
import {AppError} from '../../../shared/errors/AppError';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import type {AccountSecurityCopy} from './accountSecurityCopy';

export function SecurityLink({label, onPress, disabled = false, variant = 'outlined'}: {label: string; onPress: () => void; disabled?: boolean; variant?: 'outlined' | 'text'}): React.JSX.Element {
  if (variant === 'text') {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}}
      disabled={disabled} onPress={onPress} style={({pressed}) => [styles.link, (pressed || disabled) && styles.linkDimmed]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>;
  }
  return <RaisedButton accessibilityState={{disabled}} disabled={disabled} onPress={onPress} label={label} variant="outlined" tone="aqua" size="compact" />;
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
  link: {minHeight: 44, justifyContent: 'center', paddingVertical: 10},
  linkText: {fontFamily: typography.family, fontSize: 14, lineHeight: 20, fontWeight: '700', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  linkDimmed: {opacity: 0.5},
  notice: {fontFamily: typography.family, fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {color: challengeTheme.colors.danger},
  email: {fontFamily: typography.family, fontSize: 17, lineHeight: 24, fontWeight: '800', color: challengeTheme.colors.text, textAlign: 'center', paddingVertical: 8},
});
