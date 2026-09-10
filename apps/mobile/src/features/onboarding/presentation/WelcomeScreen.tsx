import React, {useCallback, useEffect, useRef, useState} from 'react';
import {SecurityLink} from '../../auth/presentation/AccountSecurityParts';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {BackHandler, Image, Pressable, StyleSheet, Text, TextInput, type GestureResponderEvent, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import Svg, {Path} from 'react-native-svg';
import {OnboardingMascot} from './OnboardingMascot';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {LanguageSelector} from '../../../shared/components/LanguageSelector';
import {KeyboardAwareScrollView} from '../../../shared/components/KeyboardAwareScrollView';
import {haptics} from '../../../shared/device/haptics';
import {appCopy} from '../../../shared/i18n/appLocale';
import {typography} from '../../../shared/theme/typography';
import {useRememberedAccountsStore, type RememberedAccount} from '../../auth/application/rememberedAccountsStore';
import {useSessionStore} from '../../auth/application/sessionStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {HydrationWaterGauge} from '../../hydration/presentation/HydrationWaterGauge';
import {useOnboardingPreferencesStore} from '../application/onboardingPreferencesStore';
import {WidgetOnboardingStep} from './WidgetOnboardingStep';
import {AccountAccessStep, type AccountMode} from './AccountAccessStep';

type OnboardingStep = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;
const SWIPE_BACK_EDGE_WIDTH = 36;
const SWIPE_BACK_DISTANCE = 72;
const SWIPE_BACK_MAX_VERTICAL_DISTANCE = 48;

interface ContinueButtonProps {
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function OnboardingContinueButton({label, disabled, onPress}: ContinueButtonProps): React.JSX.Element {
  const handlePress = () => {
    haptics.lightImpact();
    onPress();
  };

  return <RaisedButton label={label} onPress={handlePress} disabled={disabled} tone="aqua" size="large" style={buttonLayout.continue} />;
}

function OnboardingProgressBar({step}: {step: OnboardingStep}): React.JSX.Element {
  const progress = useSharedValue(step / TOTAL_STEPS);

  useEffect(() => {
    progress.value = withTiming(step / TOTAL_STEPS, {
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    return () => cancelAnimation(progress);
  }, [progress, step]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{min: 0, max: TOTAL_STEPS, now: step}} style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

export function WelcomeScreen({navigation}: Partial<NativeStackScreenProps<RootStackParamList, 'Welcome'>> = {}): React.JSX.Element {
  const hasCompletedWelcome = useOnboardingPreferencesStore(state => state.hasCompletedWelcome);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const selectLocale = useOnboardingPreferencesStore(state => state.selectLocale);
  const dailyGoalMl = useOnboardingPreferencesStore(state => state.dailyGoalMl);
  const selectDailyGoal = useOnboardingPreferencesStore(state => state.selectDailyGoal);
  const clearSelectedDailyGoal = useOnboardingPreferencesStore(state => state.clearSelectedDailyGoal);
  const [choosingAccount, setChoosingAccount] = useState(!hasCompletedWelcome);
  const completeWelcome = useOnboardingPreferencesStore(state => state.completeWelcome);
  const restartWelcome = useOnboardingPreferencesStore(state => state.restartWelcome);
  const rememberedAccounts = useRememberedAccountsStore(state => state.accounts);
  const resumeRememberedAccount = useSessionStore(state => state.resumeRememberedAccount);
  const removeRememberedAccount = useSessionStore(state => state.removeRememberedAccount);
  const [isReturningAccountFlow, setIsReturningAccountFlow] = useState(hasCompletedWelcome);
  const [step, setStep] = useState<OnboardingStep>(hasCompletedWelcome ? 4 : 1);
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

  const goBack = useCallback(() => {
    if (step === 4 && (accountMode === 'login' || accountMode === 'register')) {
      setAccountMode(authBackMode);
      setSelectedAccount(undefined);
      return;
    }

    if (step === 4 && accountMode === 'manage') {
      setAccountMode('returning');
      return;
    }

    if (step === 4) {
      setStep(3);
      return;
    }

    if (step === 3) setStep(2);
    if (step === 2) setStep(1);
    if (step === 1) setChoosingAccount(true);
  }, [accountMode, authBackMode, step]);

  const showAuth = useCallback((mode: 'login' | 'register', backMode: AccountMode, account?: RememberedAccount) => {
    setSelectedAccount(account);
    setAuthBackMode(backMode);
    setAccountMode(mode);
  }, []);

  const restartForNewAccount = useCallback(() => {
    setChoosingAccount(false);
    restartWelcome();
    setIsReturningAccountFlow(false);
    setGoal('2000');
    setSelectedAccount(undefined);
    setAuthBackMode('choice');
    setAccountMode('choice');
    setStep(1);
  }, [restartWelcome]);

  const resumeAccount = useCallback((account: RememberedAccount) => resumeRememberedAccount(account.id), [resumeRememberedAccount]);
  const removeAccount = useCallback((account: RememberedAccount) => removeRememberedAccount(account.id), [removeRememberedAccount]);
  const manageAccounts = useCallback(() => setAccountMode('manage'), []);

  const finishWelcome = useCallback(() => {
    completeWelcome();
  }, [completeWelcome]);

  const canGoBack = !isReturningAccountFlow || (step > 1 && accountMode !== 'returning');
  useEffect(() => {
    if (choosingAccount) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isReturningAccountFlow && !hasCompletedWelcome) {
        setChoosingAccount(true);
        return true;
      }
      if (!canGoBack) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, choosingAccount, goBack, hasCompletedWelcome, isReturningAccountFlow]);
  const swipeStart = useRef<{x: number; y: number} | undefined>(undefined);
  const beginSwipe = useCallback((event: GestureResponderEvent) => {
    swipeStart.current = {x: event.nativeEvent.pageX, y: event.nativeEvent.pageY};
  }, []);
  const finishSwipe = useCallback((event: GestureResponderEvent) => {
    const start = swipeStart.current;
    swipeStart.current = undefined;
    if (!start || !canGoBack) return;

    const horizontalDistance = event.nativeEvent.pageX - start.x;
    const verticalDistance = Math.abs(event.nativeEvent.pageY - start.y);
    if (start.x <= SWIPE_BACK_EDGE_WIDTH && horizontalDistance >= SWIPE_BACK_DISTANCE && verticalDistance <= SWIPE_BACK_MAX_VERTICAL_DISTANCE) {
      goBack();
    }
  }, [canGoBack, goBack]);
  const stepThreeTitle = accountMode === 'login'
    ? authCopy.loginTitle
    : accountMode === 'register'
      ? authCopy.registerTitle
      : accountMode === 'returning'
        ? copy.returningTitle
        : accountMode === 'manage'
          ? copy.manageAccounts
          : copy.accountTitle;
  const stepThreeSubtitle = accountMode === 'login'
    ? authCopy.loginSubtitle
    : accountMode === 'register'
      ? authCopy.registerSubtitle
      : accountMode === 'returning'
        ? copy.returningSubtitle
        : accountMode === 'manage'
          ? copy.manageAccountsSubtitle
          : copy.accountSubtitle;

  const entryText = (pt: string, en: string, es: string) => locale === 'en-US' ? en : locale === 'es-ES' ? es : pt;

  if (choosingAccount) {
    return (
      <View style={styles.page}>
        <Image pointerEvents="none" source={require('../../../assets/challenge/static/ocean-background.webp')} resizeMode="cover" style={styles.background} />
        <View pointerEvents="none" style={styles.backgroundOverlay} />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAwareScrollView contentContainerStyle={styles.returningContent}>
            <View style={styles.hero}>
              <OnboardingMascot style={styles.mascot} />
              <Text accessibilityRole="header" style={styles.title}>{entryText('Você já tem uma conta?', 'Do you already have an account?', '¿Ya tienes una cuenta?')}</Text>
              <Text style={styles.subtitle}>{entryText('Comece sua jornada ou entre para continuar de onde parou.', 'Start your journey or sign in to pick up where you left off.', 'Empieza tu camino o inicia sesión para continuar donde lo dejaste.')}</Text>
            </View>
            <RaisedButton testID="welcome-new-account" label={entryText('Sou novo por aqui', "I'm new here", 'Soy nuevo aquí')} onPress={restartForNewAccount} tone="aqua" size="large" />
            <RaisedButton testID="welcome-existing-account" label={copy.alreadyHaveAccount} variant="outlined" tone="aqua" size="large" onPress={() => {
              clearSelectedDailyGoal();
              setChoosingAccount(false);
              setIsReturningAccountFlow(true);
              setAccountMode('login');
              setStep(4);
            }} />
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (isReturningAccountFlow) {
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
          {canGoBack || !hasCompletedWelcome ? (
            <View style={styles.returningNavigation}>
              <SecurityLink variant="text" label={copy.back} onPress={() => !hasCompletedWelcome ? setChoosingAccount(true) : goBack()} />
            </View>
          ) : null}
          <KeyboardAwareScrollView contentContainerStyle={styles.returningContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.mascotOrb}>
                <OnboardingMascot style={styles.mascot} />
              </View>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text accessibilityRole="header" style={styles.title}>{stepThreeTitle}</Text>
              <Text style={styles.subtitle}>{stepThreeSubtitle}</Text>
            </View>

            <AccountAccessStep
              accounts={rememberedAccounts}
              goalMl={selectedGoal}
              locale={locale}
              mode={accountMode}
              selectedAccount={selectedAccount}
              onManageAccounts={manageAccounts}
              onAuthenticated={finishWelcome}
              onForgotPassword={email => navigation?.navigate('ForgotPassword', {email})}
              onRemoveAccount={removeAccount}
              onResumeAccount={resumeAccount}
              onRestart={restartForNewAccount}
              onShowAuth={showAuth}
            />
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </View>
    );
  }

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
        <KeyboardAwareScrollView
          testID="onboarding-scroll"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onTouchStart={beginSwipe}
          onTouchEnd={finishSwipe}>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              {canGoBack ? (
                <Pressable
                  testID="onboarding-back"
                  accessibilityRole="button"
                  accessibilityLabel={copy.back}
                  hitSlop={6}
                  onPress={goBack}
                  style={({pressed}) => [styles.backButton, pressed && styles.backButtonPressed]}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" pointerEvents="none" accessible={false}>
                    <Path d="M15 6 L9 12 L15 18" fill="none" stroke={challengeTheme.colors.cyanStrong} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              ) : <View style={styles.progressSpacer} />}
              <Text style={styles.stepLabel}>{copy.step} {step} {copy.of} {TOTAL_STEPS}</Text>
              <View style={styles.progressSpacer} />
            </View>
            <OnboardingProgressBar step={step} />
          </View>

          {step === 1 ? (
            <>
              <View style={styles.hero}>
                <View style={styles.mascotOrb}>
                  <OnboardingMascot style={styles.mascot} />
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
                <OnboardingMascot style={styles.goalMascot} />
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

          {step === 3 ? <WidgetOnboardingStep locale={locale} onContinue={() => setStep(4)} /> : null}

          {step === 4 ? (
            <>
              <View style={[styles.hero, (accountMode === 'login' || accountMode === 'register') && styles.authHero]}>
                <View style={styles.mascotOrb}>
                  <OnboardingMascot style={styles.mascot} />
                </View>
                <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
                <Text accessibilityRole="header" style={styles.title}>{stepThreeTitle}</Text>
                <Text style={styles.subtitle}>{stepThreeSubtitle}</Text>
              </View>

              <AccountAccessStep
                accounts={rememberedAccounts}
                goalMl={selectedGoal}
                locale={locale}
                mode={accountMode}
                selectedAccount={selectedAccount}
                onManageAccounts={manageAccounts}
                onAuthenticated={finishWelcome}
                onForgotPassword={email => navigation?.navigate('ForgotPassword', {email})}
                onRemoveAccount={removeAccount}
                onResumeAccount={resumeAccount}
                onRestart={restartForNewAccount}
                onShowAuth={showAuth}
              />
            </>
          ) : null}

          {step < 3 ? (
            <OnboardingContinueButton
              label={copy.continue}
              disabled={step === 2 && !goalIsValid}
              onPress={advance}
            />
          ) : null}
        </KeyboardAwareScrollView>
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
  returningContent: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: 21, paddingVertical: 28, gap: 28},
  returningNavigation: {paddingHorizontal: 21, paddingTop: 6, alignItems: 'flex-start'},
  progressSection: {gap: 8},
  progressHeader: {height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  backButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backButtonPressed: {opacity: 0.8, transform: [{scale: 0.94}]},
  stepLabel: {fontFamily: typography.family, fontSize: 12, lineHeight: 17, fontWeight: '900', color: '#D1E4E4', letterSpacing: 0.35},
  progressSpacer: {width: 44, height: 44},
  progressTrack: {height: 8, overflow: 'hidden', borderRadius: 99, backgroundColor: 'rgba(145, 200, 209, 0.2)', borderWidth: 1, borderColor: 'rgba(145, 200, 209, 0.18)'},
  progressFill: {height: '100%', borderRadius: 99, backgroundColor: challengeTheme.colors.cyanStrong},
  hero: {alignItems: 'center', gap: 8, paddingHorizontal: 10},
  authHero: {gap: 6},
  goalHero: {minHeight: 164, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7},
  goalCopy: {flex: 1, gap: 8},
  mascotOrb: {
    width: 148, height: 148, alignItems: 'center', justifyContent: 'center', borderRadius: 74,
    borderWidth: 1, borderColor: 'rgba(145, 200, 209, 0.62)', backgroundColor: 'rgba(26, 78, 95, 0.56)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.34, shadowRadius: 20, shadowOffset: {width: 0, height: 5}, elevation: 10,
  },
  mascot: {width: 146, height: 132},
  goalMascot: {width: 142, height: 142, marginRight: -18},
  eyebrow: {fontFamily: typography.family, marginTop: 4, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '900', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  title: {fontFamily: typography.family, fontSize: 29, lineHeight: 35, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  subtitle: {fontFamily: typography.family, maxWidth: 320, fontSize: 15, lineHeight: 21, color: '#C9DEDF', textAlign: 'center'},
  panel: {gap: 9, padding: 18, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  panelTitle: {fontFamily: typography.family, fontSize: 18, lineHeight: 24, fontWeight: '900', color: challengeTheme.colors.text},
  panelSubtitle: {fontFamily: typography.family, fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted, marginBottom: 2},
  inputLabel: {fontFamily: typography.family, fontSize: 14, lineHeight: 19, fontWeight: '900', color: '#D6EAEB'},
  goalInput: {height: 62, marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 17, borderRadius: 17, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  goalInputInvalid: {borderColor: challengeTheme.colors.danger},
  goalValue: {fontFamily: typography.family, flex: 1, padding: 0, color: challengeTheme.colors.text, fontSize: 23, fontWeight: '900'},
  goalUnit: {fontFamily: typography.family, fontSize: 15, fontWeight: '800', color: challengeTheme.colors.muted},
});

const buttonLayout = StyleSheet.create({continue: {width: '100%', maxWidth: 360, alignSelf: 'center'}});
