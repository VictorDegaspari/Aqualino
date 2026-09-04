import React, {useCallback, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {mascotImages} from '../../../assets/mascot/mascotImages';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {LanguageSelector} from '../../../shared/components/LanguageSelector';
import {appCopy} from '../../../shared/i18n/appLocale';
import {useRememberedAccountsStore, type RememberedAccount} from '../../auth/application/rememberedAccountsStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {HydrationWaterGauge} from '../../hydration/presentation/HydrationWaterGauge';
import {useOnboardingPreferencesStore} from '../application/onboardingPreferencesStore';
import {AccountAccessStep, type AccountMode} from './AccountAccessStep';

type OnboardingStep = 1 | 2 | 3;

const TOTAL_STEPS = 3;

export function WelcomeScreen(): React.JSX.Element {
  const hasCompletedWelcome = useOnboardingPreferencesStore(state => state.hasCompletedWelcome);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const selectLocale = useOnboardingPreferencesStore(state => state.selectLocale);
  const dailyGoalMl = useOnboardingPreferencesStore(state => state.dailyGoalMl);
  const selectDailyGoal = useOnboardingPreferencesStore(state => state.selectDailyGoal);
  const completeWelcome = useOnboardingPreferencesStore(state => state.completeWelcome);
  const restartWelcome = useOnboardingPreferencesStore(state => state.restartWelcome);
  const rememberedAccounts = useRememberedAccountsStore(state => state.accounts);
  const [step, setStep] = useState<OnboardingStep>(hasCompletedWelcome ? 3 : 1);
  const [accountMode, setAccountMode] = useState<AccountMode>(hasCompletedWelcome ? 'returning' : 'choice');
  const [authBackMode, setAuthBackMode] = useState<AccountMode>('choice');
  const [selectedAccount, setSelectedAccount] = useState<RememberedAccount>();
  const [goal, setGoal] = useState(String(dailyGoalMl));
  const copy = appCopy[locale].welcome;
  const authCopy = appCopy[locale].auth;
  const goalValue = Number(goal);
  const goalIsValid = Number.isFinite(goalValue) && goalValue >= 500 && goalValue <= 10000;
  const selectedGoal = goalIsValid ? goalValue : dailyGoalMl;

  const advance = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2 && goalIsValid) {
      selectDailyGoal(goalValue);
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 3 && (accountMode === 'login' || accountMode === 'register')) {
      setAccountMode(authBackMode);
      setSelectedAccount(undefined);
      return;
    }

    if (step === 3) {
      setStep(2);
      return;
    }

    if (step === 2) setStep(1);
  };

  const showAuth = useCallback((mode: 'login' | 'register', backMode: AccountMode, account?: RememberedAccount) => {
    setSelectedAccount(account);
    setAuthBackMode(backMode);
    setAccountMode(mode);
  }, []);

  const restartForNewAccount = useCallback(() => {
    restartWelcome();
    setGoal('2000');
    setSelectedAccount(undefined);
    setAuthBackMode('choice');
    setAccountMode('choice');
    setStep(1);
  }, [restartWelcome]);

  const finishWelcome = useCallback(() => {
    completeWelcome();
  }, [completeWelcome]);

  const canGoBack = step > 1 && !(step === 3 && accountMode === 'returning');
  const stepThreeTitle = accountMode === 'login'
    ? authCopy.loginTitle
    : accountMode === 'register'
      ? authCopy.registerTitle
      : accountMode === 'returning'
        ? copy.returningTitle
        : copy.accountTitle;
  const stepThreeSubtitle = accountMode === 'login'
    ? authCopy.loginSubtitle
    : accountMode === 'register'
      ? authCopy.registerSubtitle
      : accountMode === 'returning'
        ? copy.returningSubtitle
        : copy.accountSubtitle;

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                disabled={!canGoBack}
                onPress={goBack}
                style={({pressed}) => [styles.backButton, !canGoBack && styles.backButtonHidden, pressed && canGoBack && styles.buttonPressed]}>
                <Text style={styles.backLabel}>‹</Text>
              </Pressable>
              <Text style={styles.stepLabel}>{copy.step} {step} {copy.of} {TOTAL_STEPS}</Text>
              <View style={styles.progressSpacer} />
            </View>
            <View accessibilityRole="progressbar" accessibilityValue={{min: 0, max: TOTAL_STEPS, now: step}} style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${(step / TOTAL_STEPS) * 100}%`}]} />
            </View>
          </View>

          {step === 1 ? (
            <>
              <View style={styles.hero}>
                <View style={styles.mascotOrb}>
                  <Image source={mascotImages.empty} resizeMode="contain" style={styles.mascot} />
                </View>
                <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{copy.languageTitle}</Text>
                <Text style={styles.panelSubtitle}>{copy.languageSubtitle}</Text>
                <LanguageSelector value={locale} onChange={selectLocale} />
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.goalHero}>
                <View style={styles.goalCopy}>
                  <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                  <Text accessibilityRole="header" style={styles.title}>{copy.goalTitle}</Text>
                  <Text style={styles.subtitle}>{copy.goalSubtitle}</Text>
                </View>
                <Image source={mascotImages.empty} resizeMode="contain" style={styles.goalMascot} />
              </View>

              <View style={styles.panel}>
                <Text style={styles.inputLabel}>{copy.goalInputLabel}</Text>
                <View style={[styles.goalInput, !goalIsValid && goal.length > 0 && styles.goalInputInvalid]}>
                  <AqualinoIcon name="water" size={24} color={challengeTheme.colors.cyanStrong} />
                  <TextInput
                    accessibilityLabel={copy.goalInputLabel}
                    value={goal}
                    onChangeText={setGoal}
                    keyboardType="number-pad"
                    maxLength={5}
                    selectTextOnFocus
                    style={styles.goalValue}
                  />
                  <Text style={styles.goalUnit}>ml</Text>
                </View>
              </View>

              <HydrationWaterGauge totalMl={selectedGoal} variant="goal" locale={locale} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={[styles.hero, (accountMode === 'login' || accountMode === 'register') && styles.authHero]}>
                <View style={styles.mascotOrb}>
                  <Image source={mascotImages.empty} resizeMode="contain" style={styles.mascot} />
                </View>
                <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                <Text accessibilityRole="header" style={styles.title}>{stepThreeTitle}</Text>
                <Text style={styles.subtitle}>{stepThreeSubtitle}</Text>
              </View>

              <AccountAccessStep
                accounts={rememberedAccounts}
                authBackMode={authBackMode}
                goalMl={selectedGoal}
                locale={locale}
                mode={accountMode}
                selectedAccount={selectedAccount}
                onAuthenticated={finishWelcome}
                onRestart={restartForNewAccount}
                onShowAuth={showAuth}
              />
            </>
          ) : null}

          {step < 3 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.continue}
              accessibilityState={{disabled: step === 2 && !goalIsValid}}
              disabled={step === 2 && !goalIsValid}
              onPress={advance}
              style={({pressed}) => [styles.primaryButton, step === 2 && !goalIsValid && styles.primaryButtonDisabled, pressed && styles.buttonPressed]}>
              <Text style={styles.primaryLabel}>{copy.continue}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.73},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.48)'},
  safeArea: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 21, paddingTop: 14, paddingBottom: 28, gap: 21},
  progressSection: {gap: 8},
  progressHeader: {height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  backButton: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(2, 38, 71, 0.75)', borderWidth: 1, borderColor: challengeTheme.colors.border},
  backButtonHidden: {opacity: 0},
  backLabel: {marginTop: -3, color: challengeTheme.colors.cyanStrong, fontSize: 31, lineHeight: 31, fontWeight: '400'},
  stepLabel: {fontSize: 12, lineHeight: 17, fontWeight: '900', color: '#C7F8FF', letterSpacing: 0.35},
  progressSpacer: {width: 34},
  progressTrack: {height: 8, overflow: 'hidden', borderRadius: 99, backgroundColor: 'rgba(161, 236, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(161, 236, 255, 0.2)'},
  progressFill: {height: '100%', borderRadius: 99, backgroundColor: challengeTheme.colors.cyanStrong},
  hero: {alignItems: 'center', gap: 8, paddingHorizontal: 10},
  authHero: {gap: 6},
  goalHero: {minHeight: 164, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7},
  goalCopy: {flex: 1, gap: 8},
  mascotOrb: {
    width: 148, height: 148, alignItems: 'center', justifyContent: 'center', borderRadius: 74,
    borderWidth: 1, borderColor: 'rgba(126, 246, 255, 0.76)', backgroundColor: 'rgba(4, 99, 143, 0.56)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.68, shadowRadius: 25, shadowOffset: {width: 0, height: 5}, elevation: 12,
  },
  mascot: {width: 146, height: 132},
  goalMascot: {width: 142, height: 142, marginRight: -18},
  eyebrow: {marginTop: 4, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '900', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  title: {fontSize: 29, lineHeight: 35, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  subtitle: {maxWidth: 320, fontSize: 15, lineHeight: 21, color: '#C1E5F8', textAlign: 'center'},
  panel: {gap: 9, padding: 18, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  panelTitle: {fontSize: 18, lineHeight: 24, fontWeight: '900', color: challengeTheme.colors.text},
  panelSubtitle: {fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted, marginBottom: 2},
  inputLabel: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: '#D4F7FF'},
  goalInput: {height: 62, marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 17, borderRadius: 17, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  goalInputInvalid: {borderColor: challengeTheme.colors.danger},
  goalValue: {flex: 1, padding: 0, color: challengeTheme.colors.text, fontSize: 23, fontWeight: '900'},
  goalUnit: {fontSize: 15, fontWeight: '800', color: challengeTheme.colors.muted},
  primaryButton: {height: 57, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.52, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 8},
  primaryButtonDisabled: {opacity: 0.42, shadowOpacity: 0},
  primaryLabel: {fontSize: 17, lineHeight: 22, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  buttonPressed: {opacity: 0.86, transform: [{scale: 0.985}]},
});
