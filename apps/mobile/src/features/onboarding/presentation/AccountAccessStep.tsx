import React, {memo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
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
  authBackMode: AccountMode;
  locale: AppLocale;
  goalMl: number;
  accounts: RememberedAccount[];
  selectedAccount?: RememberedAccount;
  onShowAuth: (mode: 'login' | 'register', backMode: AccountMode, account?: RememberedAccount) => void;
  onResumeAccount: (account: RememberedAccount) => Promise<boolean>;
  onRemoveAccount: (account: RememberedAccount) => Promise<void>;
  onManageAccounts: () => void;
  onReturnToAccounts: () => void;
  onRestart: () => void;
  onAuthenticated: () => void;
}

export const AccountAccessStep = memo(function AccountAccessStepView({
  mode,
  authBackMode,
  locale,
  goalMl,
  accounts,
  selectedAccount,
  onShowAuth,
  onResumeAccount,
  onRemoveAccount,
  onManageAccounts,
  onReturnToAccounts,
  onRestart,
  onAuthenticated,
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
          <Pressable
            accessibilityRole="button"
            onPress={() => onShowAuth('register', 'choice')}
            style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.primaryLabel}>{copy.createAccount}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onShowAuth('login', 'choice')}
            style={({pressed}) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.secondaryLabel}>{copy.alreadyHaveAccount}</Text>
          </Pressable>
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
                accessibilityState={{busy: busyAccountId === account.id}}
                disabled={Boolean(busyAccountId)}
                onPress={() => resumeAccount(account)}
                style={({pressed}) => [styles.accountCard, pressed && !busyAccountId && styles.accountCardPressed]}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarLabel}>{account.displayName.trim().charAt(0).toUpperCase() || 'A'}</Text>
                </View>
                <View style={styles.accountIdentity}>
                  <Text numberOfLines={1} style={styles.accountName}>{account.displayName}</Text>
                  <Text numberOfLines={1} style={styles.accountEmail}>{account.email}</Text>
                </View>
                <Text style={styles.accountAction}>{busyAccountId === account.id ? '…' : `${copy.signIn} ›`}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => onShowAuth('login', 'returning')}
            style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.primaryLabel}>{copy.alreadyHaveAccount}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          style={({pressed}) => [styles.addAccountButton, pressed && styles.buttonPressed]}>
          <Text style={styles.addAccountIcon}>＋</Text>
          <View style={styles.addAccountCopy}>
            <Text style={styles.addAccountTitle}>{copy.addAccount}</Text>
            <Text style={styles.addAccountSubtitle}>{copy.addAccountSubtitle}</Text>
          </View>
        </Pressable>
        {accounts.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onManageAccounts}
            style={({pressed}) => [styles.manageAccountsButton, pressed && styles.buttonPressed]}>
            <Text style={styles.manageAccountsLabel}>{copy.manageAccounts}</Text>
          </Pressable>
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
                accessibilityState={{busy: busyAccountId === account.id}}
                disabled={Boolean(busyAccountId)}
                onPress={() => removeAccount(account)}
                style={({pressed}) => [styles.removeAccountButton, pressed && !busyAccountId && styles.buttonPressed]}>
                <Text style={styles.removeAccountLabel}>{busyAccountId === account.id ? '…' : copy.removeAccount}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onReturnToAccounts}
          style={({pressed}) => [styles.backToAccountsButton, pressed && styles.buttonPressed]}>
          <Text style={styles.backToAccountsLabel}>{copy.backToAccounts}</Text>
        </Pressable>
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
        />
      </View>
    );
  }

  return (
    <View style={styles.authPanel}>
      <RegisterForm
        onAuthenticated={onAuthenticated}
        onLogin={() => onShowAuth('login', authBackMode)}
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
  accountAvatar: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(83, 240, 255, 0.68)', backgroundColor: 'rgba(29, 174, 211, 0.2)',
  },
  accountAvatarLabel: {fontFamily: typography.family, fontSize: 20, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  accountIdentity: {flex: 1, gap: 2},
  accountName: {fontFamily: typography.family, fontSize: 16, lineHeight: 21, fontWeight: '900', color: challengeTheme.colors.text},
  accountEmail: {fontFamily: typography.family, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  accountAction: {fontFamily: typography.family, fontSize: 12, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  manageAccountsButton: {minHeight: 43, alignItems: 'center', justifyContent: 'center'},
  manageAccountsLabel: {fontFamily: typography.family, fontSize: 13, lineHeight: 18, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  addAccountButton: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: 'rgba(0, 21, 47, 0.58)',
  },
  addAccountIcon: {fontFamily: typography.family, width: 35, fontSize: 28, lineHeight: 32, fontWeight: '500', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  addAccountCopy: {flex: 1, gap: 2},
  addAccountTitle: {fontFamily: typography.family, fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.text},
  addAccountSubtitle: {fontFamily: typography.family, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  securityHint: {fontFamily: typography.family, paddingHorizontal: 8, fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {fontFamily: typography.family, color: challengeTheme.colors.danger, textAlign: 'center', fontWeight: '700'},
  removeAccountButton: {paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(166, 42, 63, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 119, 137, 0.54)'},
  removeAccountLabel: {fontFamily: typography.family, fontSize: 11, lineHeight: 15, fontWeight: '900', color: challengeTheme.colors.danger},
  backToAccountsButton: {minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  backToAccountsLabel: {fontFamily: typography.family, fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  authPanel: {
    gap: 14, padding: 19, borderRadius: challengeTheme.radius.panel, borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel,
  },
  primaryButton: {height: 57, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.52, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 8},
  primaryLabel: {fontFamily: typography.family, fontSize: 17, lineHeight: 22, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  secondaryButton: {height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: 'rgba(0, 21, 47, 0.58)'},
  secondaryLabel: {fontFamily: typography.family, fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  buttonPressed: {opacity: 0.86, transform: [{scale: 0.985}]},
});
