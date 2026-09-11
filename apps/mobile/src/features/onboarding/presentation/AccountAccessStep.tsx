import React, {memo, useState} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy, type AppLocale} from '../../../shared/i18n/appLocale';
import {typography} from '../../../shared/theme/typography';
import type {RememberedAccount} from '../../auth/application/rememberedAccountsStore';
import {LoginForm} from '../../auth/presentation/LoginScreen';
import {RegisterForm} from '../../auth/presentation/RegisterScreen';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export type AccountMode = 'choice' | 'returning' | 'manage' | 'login' | 'register';

interface Props {
  mode: AccountMode;
  locale: AppLocale;
  goalMl: number;
  accounts: RememberedAccount[];
  selectedAccount?: RememberedAccount;
  onShowAuth: (mode: 'login' | 'register', backMode: AccountMode, account?: RememberedAccount) => void;
  onResumeAccount: (account: RememberedAccount) => Promise<boolean>;
  onRemoveAccount: (account: RememberedAccount) => Promise<void>;
  onManageAccounts: () => void;
  onRestart: () => void;
  onAuthenticated: () => void;
  onForgotPassword?: (email: string) => void;
}

export const AccountAccessStep = memo(function AccountAccessStepView({
  mode,
  locale,
  goalMl,
  accounts,
  selectedAccount,
  onShowAuth,
  onResumeAccount,
  onRemoveAccount,
  onManageAccounts,
  onRestart,
  onAuthenticated,
  onForgotPassword,
}: Props): React.JSX.Element {
  const copy = appCopy[locale].welcome;
  const [busyAccountId, setBusyAccountId] = useState<string>();
  const [error, setError] = useState<string>();

  const accountActionError = (cause: unknown, fallback: string) => {
    if (cause instanceof AppError && (cause.code === 'NETWORK_UNAVAILABLE' || cause.code === 'REQUEST_TIMEOUT')) {
      return copy.offlineAccountError;
    }

    return cause instanceof AppError ? cause.message : fallback;
  };

  const resumeAccount = async (account: RememberedAccount) => {
    setBusyAccountId(account.id);
    setError(undefined);
    try {
      const resumed = await onResumeAccount(account);
      if (!resumed) onShowAuth('login', 'returning', account);
    } catch (cause) {
      setError(accountActionError(cause, copy.resumeAccountError));
    } finally {
      setBusyAccountId(undefined);
    }
  };

  const removeAccount = async (account: RememberedAccount) => {
    setBusyAccountId(account.id);
    setError(undefined);
    try {
      await onRemoveAccount(account);
    } catch (cause) {
      setError(accountActionError(cause, copy.removeAccountError));
    } finally {
      setBusyAccountId(undefined);
    }
  };

  if (mode === 'choice') {
    return (
      <>
        <View style={styles.summary}>
          <AqualinoIcon name="water" size={20} color={challengeTheme.colors.cyanStrong} />
          <Text style={styles.summaryText}>{new Intl.NumberFormat(locale).format(goalMl)} ml</Text>
        </View>
        <View style={styles.actions}>
          <RaisedButton onPress={() => onShowAuth('register', 'choice')} label={copy.createAccount} tone="aqua" />
        </View>
      </>
    );
  }

  if (mode === 'returning') {
    return (
      <View style={styles.returningSection}>
        {accounts.length > 0 ? (
          <View style={styles.accountList}>
            <Text style={styles.panelTitle}>{copy.savedAccounts}</Text>
            {accounts.map(account => (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                accessibilityLabel={`${copy.continueAs} ${account.displayName}`}
                accessibilityState={{busy: busyAccountId === account.id, disabled: Boolean(busyAccountId)}}
                accessibilityValue={{text: busyAccountId === account.id ? copy.signingIn : undefined}}
                accessibilityLiveRegion="polite"
                disabled={Boolean(busyAccountId)}
                onPress={() => resumeAccount(account)}
                style={({pressed}) => [styles.accountCard, busyAccountId === account.id && styles.accountCardLoading, pressed && !busyAccountId && styles.accountCardPressed]}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarLabel}>{account.displayName.trim().charAt(0).toUpperCase() || 'A'}</Text>
                </View>
                <View style={styles.accountIdentity}>
                  <Text numberOfLines={1} style={styles.accountName}>{account.displayName}</Text>
                  <Text numberOfLines={1} style={styles.accountEmail}>{account.email}</Text>
                </View>
                <View pointerEvents="none" style={styles.accountActionContent}>
                  {busyAccountId === account.id ? (
                    <ActivityIndicator testID="saved-account-signing-in" size="small" color={challengeTheme.colors.cyanStrong} accessible={false} />
                  ) : null}
                  <Text style={styles.accountAction}>{busyAccountId === account.id ? copy.signingIn : `${copy.signIn} ›`}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <RaisedButton onPress={() => onShowAuth('login', 'returning')} label={copy.alreadyHaveAccount} tone="aqua" />
        )}
        <RaisedButton onPress={onRestart} label={copy.addAccount} variant="outlined" tone="aqua" subtitle={copy.addAccountSubtitle} />
        {accounts.length > 0 ? (
          <RaisedButton onPress={onManageAccounts} label={copy.manageAccounts} variant="outlined" tone="neutral" size="compact" />
        ) : null}
        <Text style={styles.securityHint}>{copy.savedAccountSecurity}</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  if (mode === 'manage') {
    return (
      <View style={styles.returningSection}>
        <View style={styles.accountList}>
          {accounts.map(account => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarLabel}>{account.displayName.trim().charAt(0).toUpperCase() || 'A'}</Text>
              </View>
              <View style={styles.accountIdentity}>
                <Text numberOfLines={1} style={styles.accountName}>{account.displayName}</Text>
                <Text numberOfLines={1} style={styles.accountEmail}>{account.email}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.removeAccount} ${account.email}`}
                accessibilityState={{busy: busyAccountId === account.id, disabled: Boolean(busyAccountId)}}
                disabled={Boolean(busyAccountId)}
                onPress={() => removeAccount(account)}
                style={[styles.removeButton, Boolean(busyAccountId) && styles.removeButtonDisabled]}>
                {({pressed}) => (
                  <>
                    <View pointerEvents="none" style={[styles.removeButtonDepth, pressed && styles.removeButtonDepthPressed]} />
                    <View pointerEvents="none" style={[styles.removeButtonFace, pressed && styles.removeButtonPressed]}>
                      {busyAccountId === account.id ? <ActivityIndicator size="small" color="#411820" accessible={false} /> : (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessible={false}>
                          <Path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7" stroke="#411820" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      )}
                    </View>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  if (mode === 'login') {
    return (
      <View style={styles.authPanel}>
        <LoginForm
          key={selectedAccount?.id ?? 'manual-login'}
          initialEmail={selectedAccount?.email}
          onAuthenticated={onAuthenticated}
          onCreateAccount={onRestart}
          onForgotPassword={onForgotPassword}
        />
      </View>
    );
  }

  return (
    <View style={styles.authPanel}>
      <RegisterForm
        onAuthenticated={onAuthenticated}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  summary: {height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.55)', backgroundColor: 'rgba(11, 225, 236, 0.13)'},
  summaryText: {fontFamily: typography.family, fontSize: 17, lineHeight: 22, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  actions: {gap: 10},
  returningSection: {gap: 14},
  accountList: {gap: 10},
  panelTitle: {fontFamily: typography.family, fontSize: 18, lineHeight: 24, fontWeight: '900', color: challengeTheme.colors.text},
  accountCard: {
    minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 20, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel,
  },
  accountCardPressed: {opacity: 0.82, borderColor: challengeTheme.colors.cyanStrong},
  accountCardLoading: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: 'rgba(29, 174, 211, 0.14)'},
  accountAvatar: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(83, 240, 255, 0.68)', backgroundColor: 'rgba(29, 174, 211, 0.2)',
  },
  accountAvatarLabel: {fontFamily: typography.family, fontSize: 20, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  accountIdentity: {flex: 1, minWidth: 0, gap: 2},
  accountName: {fontFamily: typography.family, fontSize: 16, lineHeight: 21, fontWeight: '900', color: challengeTheme.colors.text},
  accountEmail: {fontFamily: typography.family, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  accountActionContent: {minWidth: 68, alignItems: 'center', justifyContent: 'center', gap: 4},
  accountAction: {fontFamily: typography.family, fontSize: 12, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  removeButton: {width: 44, height: 44, borderRadius: 12, paddingBottom: 4, flexShrink: 0},
  removeButtonDepth: {position: 'absolute', left: 0, right: 0, bottom: 0, height: 20, borderRadius: 12, backgroundColor: '#9E485A'},
  removeButtonDepthPressed: {opacity: 0},
  removeButtonFace: {height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF94A4'},
  removeButtonPressed: {transform: [{translateY: 4}]},
  removeButtonDisabled: {opacity: 0.45},
  securityHint: {fontFamily: typography.family, paddingHorizontal: 8, fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {fontFamily: typography.family, color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
  authPanel: {
    gap: 14, padding: 19, borderRadius: challengeTheme.radius.panel, borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel,
  },
});
