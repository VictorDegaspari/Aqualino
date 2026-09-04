import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {mascotImages} from '../../../assets/mascot/mascotImages';
import {LanguageSelector} from '../../../shared/components/LanguageSelector';
import {AppError} from '../../../shared/errors/AppError';
import {appCopy} from '../../../shared/i18n/appLocale';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {useSessionStore} from '../../auth/application/sessionStore';
import {authRepository} from '../../auth/data/authRepository';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {hydrationRemoteRepository} from '../../hydration/data/hydrationRemoteRepository';
import {HydrationWaterGauge} from '../../hydration/presentation/HydrationWaterGauge';
import {useOnboardingPreferencesStore} from '../application/onboardingPreferencesStore';

const VOLUMES = [200, 300, 500, 750];

export function OnboardingScreen(): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const selectLocale = useOnboardingPreferencesStore(state => state.selectLocale);
  const dailyGoalMl = useOnboardingPreferencesStore(state => state.dailyGoalMl);
  const hasSelectedDailyGoal = useOnboardingPreferencesStore(state => state.hasSelectedDailyGoal);
  const clearSelectedDailyGoal = useOnboardingPreferencesStore(state => state.clearSelectedDailyGoal);
  const [goal, setGoal] = useState(String(hasSelectedDailyGoal ? dailyGoalMl : 2000));
  const [volumes, setVolumes] = useState([200, 300, 500]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const copy = appCopy[locale].setup;
  const goalValue = Number(goal);
  const goalIsValid = Number.isFinite(goalValue) && goalValue >= 500 && goalValue <= 10000;
  const gaugeGoal = goalIsValid ? goalValue : 2000;

  const toggleVolume = (volume: number) => {
    setVolumes(current => current.includes(volume) ? current.filter(value => value !== volume) : [...current, volume]);
  };

  const complete = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      await hydrationRemoteRepository.updateGoal(goalValue);
      await authRepository.updateProfile({
        timezone: user?.profile.timezone ?? 'America/Sao_Paulo',
        locale,
        favorite_volumes_ml: volumes,
        onboarding_completed: true,
      });
      await refreshUser();
      if (hasSelectedDailyGoal) clearSelectedDailyGoal();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : copy.saveError);
    } finally {
      setLoading(false);
    }
  }, [clearSelectedDailyGoal, copy.saveError, goalValue, hasSelectedDailyGoal, locale, refreshUser, user?.profile.timezone, volumes]);

  useEffect(() => {
    if (hasSelectedDailyGoal) complete().catch(() => undefined);
  }, [complete, hasSelectedDailyGoal]);

  if (hasSelectedDailyGoal) {
    return (
      <View style={styles.page}>
        <Image pointerEvents="none" source={require('../../../assets/challenge/static/ocean-background.webp')} resizeMode="cover" style={styles.background} />
        <View pointerEvents="none" style={styles.backgroundOverlay} />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.syncContent} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.iconOrb}>
                <Image source={mascotImages.empty} resizeMode="contain" style={styles.syncMascot} />
              </View>
              <Text accessibilityRole="header" style={styles.title}>{copy.savingTitle}</Text>
              <Text style={styles.subtitle}>{copy.savingSubtitle}</Text>
            </View>
            <View style={styles.panel}>
              {loading ? <ActivityIndicator size="large" color={challengeTheme.colors.cyanStrong} /> : null}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              {error ? (
                <Pressable accessibilityRole="button" onPress={complete} style={({pressed}) => [styles.finishButton, pressed && styles.finishButtonPressed]}>
                  <Text style={styles.finishLabel}>{copy.retry}</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.gaugeDock}>
              <HydrationWaterGauge totalMl={gaugeGoal} variant="goal" locale={locale} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Image pointerEvents="none" source={require('../../../assets/challenge/static/ocean-background.webp')} resizeMode="cover" style={styles.background} />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.iconOrb}><AqualinoIcon name="waterPlus" size={45} color={challengeTheme.colors.cyanStrong} /></View>
            <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.goalHeader}>
              <View style={styles.goalCopy}>
                <Text style={styles.sectionTitle}>{copy.goalTitle}</Text>
                <Text style={styles.sectionSubtitle}>{copy.goalSubtitle}</Text>
              </View>
              <Image
                accessibilityLabel={copy.goalMascotLabel}
                source={mascotImages.empty}
                resizeMode="contain"
                style={styles.goalMascot}
              />
            </View>
            <View style={styles.goalInput}>
              <AqualinoIcon name="water" size={24} color={challengeTheme.colors.cyanStrong} />
              <TextInput
                accessibilityLabel="Meta diária em ml"
                value={goal}
                onChangeText={setGoal}
                keyboardType="number-pad"
                maxLength={5}
                style={styles.goalValue}
              />
              <Text style={styles.goalUnit}>ml</Text>
            </View>

            <View style={styles.volumesHeader}>
              <View style={styles.volumesCopy}>
                <Text style={styles.sectionTitle}>{copy.quickVolumes}</Text>
                <Text style={styles.sectionSubtitle}>{copy.quickVolumesSubtitle}</Text>
              </View>
              <AqualinoIcon name="waves" size={28} color={challengeTheme.colors.cyan} />
            </View>
            <View style={styles.chips}>
              {VOLUMES.map(volume => {
                const selected = volumes.includes(volume);
                return (
                  <Pressable
                    key={volume}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${volume} ml`}
                    accessibilityState={{checked: selected}}
                    onPress={() => toggleVolume(volume)}
                    style={({pressed}) => [styles.chip, selected && styles.chipSelected, pressed && styles.chipPressed]}>
                    {selected ? <AqualinoIcon name="check" size={16} color={challengeTheme.colors.backgroundDeep} /> : null}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{volume} ml</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.languageSection}>
              <Text style={styles.sectionTitle}>{copy.language}</Text>
              <Text style={styles.sectionSubtitle}>{copy.languageSubtitle}</Text>
              <LanguageSelector value={locale} onChange={selectLocale} />
            </View>

            <View style={styles.timezone}>
              <AqualinoIcon name="history" size={17} color={challengeTheme.colors.cyanStrong} />
              <Text style={styles.timezoneText}>{copy.timezone}: {user?.profile.timezone ?? 'America/Sao_Paulo'}</Text>
            </View>
            <Text style={styles.notice}>{copy.notice}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.finish}
              accessibilityState={{disabled: !goalIsValid || volumes.length === 0, busy: loading}}
              disabled={!goalIsValid || volumes.length === 0 || loading}
              onPress={complete}
              style={({pressed}) => [styles.finishButton, (!goalIsValid || volumes.length === 0 || loading) && styles.finishButtonDisabled, pressed && !loading && styles.finishButtonPressed]}>
              {loading ? <ActivityIndicator color={challengeTheme.colors.backgroundDeep} /> : <Text style={styles.finishLabel}>{copy.finish}</Text>}
            </Pressable>
          </View>

          <View style={styles.gaugeDock}>
            <HydrationWaterGauge totalMl={gaugeGoal} variant="goal" locale={locale} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.72},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.54)'},
  safeArea: {flex: 1},
  content: {paddingHorizontal: 18, paddingVertical: 28, gap: 21},
  syncContent: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 28, gap: 21},
  hero: {alignItems: 'center', gap: 8},
  iconOrb: {width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 225, 236, 0.14)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.56)', shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: {width: 0, height: 0}, elevation: 8},
  syncMascot: {width: 98, height: 88},
  title: {fontSize: 29, lineHeight: 36, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  subtitle: {maxWidth: 295, color: challengeTheme.colors.muted, fontSize: 15, lineHeight: 21, textAlign: 'center'},
  panel: {gap: 9, padding: 20, borderRadius: challengeTheme.radius.panel, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 7},
  goalHeader: {minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  goalCopy: {flex: 1, gap: 3},
  goalMascot: {width: 112, height: 92, marginRight: -9},
  sectionTitle: {fontSize: 19, lineHeight: 25, fontWeight: '900', color: challengeTheme.colors.text},
  sectionSubtitle: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.muted},
  goalInput: {height: 62, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 17, borderRadius: 17, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  goalValue: {flex: 1, padding: 0, color: challengeTheme.colors.text, fontSize: 23, fontWeight: '900'},
  goalUnit: {fontSize: 15, fontWeight: '800', color: challengeTheme.colors.muted},
  volumesHeader: {marginTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  volumesCopy: {flex: 1, gap: 3},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8},
  chip: {minWidth: '46%', flexGrow: 1, height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  chipSelected: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: challengeTheme.colors.cyanStrong},
  chipPressed: {opacity: 0.8, transform: [{scale: 0.98}]},
  chipText: {fontSize: 15, fontWeight: '800', color: challengeTheme.colors.text},
  chipTextSelected: {color: challengeTheme.colors.backgroundDeep},
  languageSection: {gap: 7, marginTop: 17, paddingTop: 17, borderTopWidth: 1, borderTopColor: challengeTheme.colors.border},
  timezone: {marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 7},
  timezoneText: {fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  notice: {marginTop: 4, fontSize: 12, lineHeight: 17, color: '#B4D5E7'},
  error: {marginTop: 4, color: challengeTheme.colors.danger, textAlign: 'center'},
  finishButton: {height: 56, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 8},
  finishButtonDisabled: {opacity: 0.42, shadowOpacity: 0},
  finishButtonPressed: {transform: [{scale: 0.985}, {translateY: 2}]},
  finishLabel: {fontSize: 17, lineHeight: 22, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  gaugeDock: {marginTop: 2, paddingBottom: 6},
});
