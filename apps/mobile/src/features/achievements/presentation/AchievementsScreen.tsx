import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Achievement, AchievementCode} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useAchievementLocalStore} from '../application/achievementLocalStore';
import {AchievementMedal} from './AchievementMedal';
import {AchievementModal} from './AchievementModal';
import {achievementCopy, type AchievementCopy} from './achievementCopy';
import {SwipeBackScreen} from './SwipeBackScreen';
import {useAchievements} from './useAchievements';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

export function AchievementsScreen({navigation}: Props): React.JSX.Element {
  const {items, unlockedCount, query} = useAchievements();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const [selectedCode, setSelectedCode] = useState<AchievementCode | null>(null);
  const selected = items.find(item => item.code === selectedCode);
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  useEffect(() => {
    useAchievementLocalStore.getState().setDetailOpen(Boolean(selected));
    return () => useAchievementLocalStore.getState().setDetailOpen(false);
  }, [selected]);
  return (
    <>
      <SwipeBackScreen onBack={onBack}>{close => <AchievementCollectionView
        items={items} unlockedCount={unlockedCount} copy={achievementCopy[locale]}
        loading={query.isPending} refreshing={query.isFetching && !query.isPending} error={query.isError}
        onBack={close} onSelect={item => setSelectedCode(item.code)} onRefresh={() => {query.refetch();}} />}</SwipeBackScreen>
      {selected ? <AchievementModal achievement={selected} copy={achievementCopy[locale]} locale={locale} onClose={() => setSelectedCode(null)} /> : null}
    </>
  );
}

export function AchievementCollectionView({items, unlockedCount, copy, loading, refreshing, error, onBack, onSelect, onRefresh}: {
  items: Achievement[]; unlockedCount: number; copy: AchievementCopy; loading?: boolean; refreshing?: boolean; error?: boolean;
  onBack: () => void; onSelect: (achievement: Achievement) => void; onRefresh: () => void;
}): React.JSX.Element {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const {width, fontScale} = useWindowDimensions();
  const columns = width < 350 || fontScale > 1.3 ? 1 : width > 650 ? 3 : 2;
  const visible = items.filter(item => filter === 'all' || (filter === 'earned' ? Boolean(item.unlocked_at) : !item.unlocked_at));
  return (
    <View style={styles.page}>
      <Image source={require('../../../assets/challenge/static/ocean-background.webp')} style={styles.background} resizeMode="cover" />
      <View style={styles.overlay} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={onBack} style={styles.back}><Text style={styles.backLabel}>‹</Text></Pressable>
          <Text accessibilityRole="header" style={styles.topTitle}>{copy.title}</Text>
          <Text style={styles.count}>{unlockedCount}/{items.length}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={challengeTheme.colors.cyanStrong} />}>
          <Text style={styles.headline}>{copy.subtitle}</Text>
          <Text style={styles.hint}>{copy.swipeHint}</Text>
          <View style={styles.filters}>
            {(['all', 'earned', 'locked'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected: value === filter}}
              onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
              <Text style={[styles.filterLabel, filter === value && styles.filterLabelActive]}>{value === 'all' ? copy.allFilter : value === 'earned' ? copy.earned : copy.lockedFilter}</Text>
            </Pressable>)}
          </View>
          {loading ? <View style={styles.notice}><ActivityIndicator color={challengeTheme.colors.cyanStrong} /><Text style={styles.description}>{copy.loading}</Text></View> : null}
          {error ? <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.description}>{copy.error}</Text>
            <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.retry}><Text style={styles.retryLabel}>{copy.retry}</Text></Pressable>
          </View> : null}
          {!visible.length ? <Text style={styles.description}>{filter === 'locked' ? copy.noLocked : copy.empty}</Text> : null}
          {(['beginnings', 'consistency', 'goals'] as const).map(category => {
            const section = visible.filter(item => item.category === category);
            if (!section.length) return null;
            return <View key={category} style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>{copy[category]}</Text>
              <View style={styles.grid}>
                {section.map(item => <Pressable key={item.code} accessibilityRole="button"
                  accessibilityLabel={`${copy.items[item.code].title}. ${item.unlocked_at ? copy.earnedBadge : `${copy.locked}. ${copy.progressLabel(item.progress, item.target)}`}`}
                  onPress={() => onSelect(item)} style={({pressed}) => [styles.achievement, {width: `${100 / columns - (columns === 1 ? 0 : 2)}%`}, item.unlocked_at && styles.earned, pressed && styles.pressed]}>
                  <AchievementMedal achievement={item} size={100} />
                  <Text style={styles.itemTitle}>{copy.items[item.code].title}</Text>
                  <Text style={styles.description}>{copy.items[item.code].description}</Text>
                  <Text style={[styles.status, item.unlocked_at && styles.earnedStatus]}>{item.unlocked_at ? `✓ ${copy.earnedBadge}` : copy.progressLabel(item.progress, item.target)}</Text>
                </Pressable>)}
              </View>
            </View>;
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background}, background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.3},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3,20,30,0.68)'}, safeArea: {flex: 1},
  topbar: {flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8},
  back: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}, backLabel: {fontSize: 40, color: challengeTheme.colors.cyanStrong},
  topTitle: {flex: 1, fontSize: 22, fontWeight: '900', color: challengeTheme.colors.text}, count: {fontSize: 13, fontWeight: '900', color: '#E7C478', paddingRight: 10},
  content: {padding: 22, paddingTop: 12, paddingBottom: 34, gap: 18}, headline: {fontSize: 26, lineHeight: 34, fontWeight: '900', color: challengeTheme.colors.text},
  hint: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, filter: {minHeight: 43, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: challengeTheme.colors.border},
  filterActive: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.cyanStrong}, filterLabel: {fontSize: 12, fontWeight: '900', color: challengeTheme.colors.muted}, filterLabelActive: {color: challengeTheme.colors.backgroundDeep},
  section: {gap: 12}, sectionTitle: {fontSize: 16, fontWeight: '900', color: challengeTheme.colors.text}, grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12},
  achievement: {alignItems: 'center', gap: 9, padding: 14, borderRadius: 20, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.border},
  earned: {borderColor: '#7D7954', backgroundColor: 'rgba(29,56,60,0.96)'}, itemTitle: {fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center', color: challengeTheme.colors.text},
  description: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted, textAlign: 'center'}, status: {marginTop: 'auto', paddingTop: 5, fontSize: 11, fontWeight: '900', color: challengeTheme.colors.muted}, earnedStatus: {color: '#E7C478'},
  notice: {gap: 10, padding: 14, alignItems: 'center'}, retry: {minHeight: 44, justifyContent: 'center'}, retryLabel: {fontSize: 14, fontWeight: '900', color: challengeTheme.colors.cyanStrong}, pressed: {opacity: 0.78},
});
