import React, {useCallback, useEffect, useRef, useState} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ScrollView as GestureScrollView} from 'react-native-gesture-handler';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Achievement, AchievementCode} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {profileAchievements} from '../application/achievementCatalog';
import {achievementPalette} from './AchievementArtwork';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useAchievementLocalStore} from '../application/achievementLocalStore';
import {AchievementMedal} from './AchievementMedal';
import {AchievementModal} from './AchievementModal';
import {achievementCopy, type AchievementCopy} from './achievementCopy';
import {SwipeBackScreen} from '../../../shared/components/SwipeBackScreen';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {useAchievements} from './useAchievements';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

export function AchievementsScreen({navigation}: Props): React.JSX.Element {
  const {items, unlockedCount, query, userId, profileCodes, saveHighlights} = useAchievements();
  const [editing, setEditing] = useState(false);
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const [selectedCode, setSelectedCode] = useState<AchievementCode | null>(null);
  useEffect(() => {setSelectedCode(null); setEditing(false);}, [userId]);
  const selected = items.find(item => item.code === selectedCode);
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  useEffect(() => {
    useAchievementLocalStore.getState().setDetailOpen(Boolean(selected) || editing);
    return () => useAchievementLocalStore.getState().setDetailOpen(false);
  }, [selected, editing]);
  return (
    <>
      <SwipeBackScreen testID="achievements" onBack={onBack}>{close => <AchievementCollectionView
        key={userId} items={items} unlockedCount={unlockedCount} copy={achievementCopy[locale]} locale={locale}
        profileCodes={profileCodes} onEditingChange={setEditing}
        onSaveHighlights={saveHighlights}
        loading={query.isPending} refreshing={query.isFetching && !query.isPending} error={query.isError}
        onBack={close} onSelect={item => setSelectedCode(item.code)} onRefresh={() => {query.refetch();}} />}</SwipeBackScreen>
      {selected ? <AchievementModal achievement={selected} copy={achievementCopy[locale]} locale={locale} onClose={() => setSelectedCode(null)} /> : null}
    </>
  );
}

export function AchievementCollectionView({items, unlockedCount, copy, locale = 'pt-BR', loading, refreshing, error, profileCodes, onSaveHighlights, onEditingChange, onBack, onSelect, onRefresh}: {
  items: Achievement[]; unlockedCount: number; copy: AchievementCopy; locale?: AppLocale; loading?: boolean; refreshing?: boolean; error?: boolean;
  profileCodes?: AchievementCode[]; onSaveHighlights?: (codes: AchievementCode[]) => boolean | Promise<boolean>; onEditingChange?: (editing: boolean) => void;
  onBack: () => void; onSelect: (achievement: Achievement) => void; onRefresh: () => void;
}): React.JSX.Element {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AchievementCode[]>([]);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const edit = (active: boolean) => {
    if (savingRef.current) return;
    setSaveError(false);
    if (active) setDraft(profileAchievements(items, profileCodes).filter(item => item.unlocked_at).map(item => item.code));
    setEditing(active);
    onEditingChange?.(active);
  };
  const toggle = (item: Achievement) => {
    if (savingRef.current || !item.unlocked_at) return;
    setSaveError(false);
    setDraft(current => current.includes(item.code) ? current.filter(code => code !== item.code) : current.length < 4 ? [...current, item.code] : current);
  };
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const eligible = draft.filter(code => items.some(item => item.code === code && item.unlocked_at));
    try {
      const saved = await onSaveHighlights?.(eligible);
      savingRef.current = false;
      if (saved) edit(false);
      else setSaveError(true);
    } catch {setSaveError(true);}
    finally {savingRef.current = false; setSaving(false);}
  };
  const {width, fontScale} = useWindowDimensions();
  const columns = fontScale > 1.7 ? 1 : width < 350 || fontScale > 1.15 ? 2 : width > 650 ? 4 : 3;
  const highlights = profileAchievements(items, profileCodes).filter(item => item.unlocked_at);
  const medalSize = Math.min(112, (width - 44) / columns - 12);
  const visible = items.filter(item => editing ? Boolean(item.unlocked_at) : filter === 'all' || (filter === 'earned' ? Boolean(item.unlocked_at) : !item.unlocked_at));
  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={onBack} style={styles.back}><Text style={styles.backLabel}>‹</Text></Pressable>
          <Text accessibilityRole="header" style={styles.topTitle}>{copy.title}</Text>
          <Text style={styles.count}>{unlockedCount}/{items.length}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={challengeTheme.colors.cyanStrong} colors={[challengeTheme.colors.cyanStrong]} />}>
          {!editing && filter === 'all' && highlights.length ? <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{copy.highlights}</Text>
            <GestureScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights}>
              {highlights.map(item => <Pressable key={item.code} accessibilityRole="button"
                accessibilityLabel={`${copy.highlights}. ${copy.items[item.code].title}. ${copy.earnedBadge}`}
                onPress={() => onSelect(item)} style={({pressed}) => [styles.highlight, {width: 140 * Math.min(fontScale, 2), borderColor: `${achievementPalette(item.code).shade}66`}, pressed && styles.pressed]}>
                <AchievementMedal achievement={item} size={104} />
                <Text style={styles.itemTitle}>{copy.items[item.code].title}</Text>
                <Text style={styles.highlightDate}>{new Date(item.unlocked_at!).toLocaleDateString(locale, {day: 'numeric', month: 'short', year: 'numeric'})}</Text>
              </Pressable>)}
            </GestureScrollView>
          </View> : null}
          <View style={styles.collectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{editing ? copy.editHighlights : copy.title}</Text>
            <Text style={styles.collectionCount}>{editing ? copy.selectHighlights : copy.collectionCount(unlockedCount, items.length)}</Text>
            {!editing && onSaveHighlights ? <RaisedButton
              testID="achievement-edit-highlights"
              onPress={() => edit(true)}
              label={copy.editHighlights}
              variant="outlined"
              tone="aqua"
              size="compact"
            /> : null}
          </View>
          {!editing ? <View style={styles.filters}>
            {(['all', 'earned', 'locked'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{selected: value === filter}}
              onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
              <Text style={[styles.filterLabel, filter === value && styles.filterLabelActive]}>{value === 'all' ? copy.allFilter : value === 'earned' ? copy.earned : copy.lockedFilter}</Text>
            </Pressable>)}
          </View> : null}
          {loading ? <View style={styles.notice}><LoadingWaterDrop size={42} accessibilityLabel={copy.loading} /><Text style={styles.description}>{copy.loading}</Text></View> : null}
          {error ? <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.description}>{copy.error}</Text>
            <RaisedButton onPress={onRefresh} label={copy.retry} variant="outlined" tone="aqua" />
          </View> : null}
          {!visible.length ? <Text style={styles.description}>{!editing && filter === 'locked' ? copy.noLocked : copy.empty}</Text> : null}
          {(['beginnings', 'consistency', 'goals', 'levels'] as const).map(category => {
            const section = visible.filter(item => item.category === category);
            if (!section.length) return null;
            return <View key={category} style={styles.section}>
              <Text accessibilityRole="header" style={styles.categoryTitle}>{copy[category]}</Text>
              <View style={styles.grid}>
                {section.map(item => <Pressable key={item.code} accessibilityRole={editing ? 'checkbox' : 'button'}
                  accessibilityState={editing ? {checked: draft.includes(item.code), disabled: saving || (draft.length >= 4 && !draft.includes(item.code))} : undefined}
                  disabled={editing && (saving || (draft.length >= 4 && !draft.includes(item.code)))}
                  accessibilityLabel={`${copy.items[item.code].title}. ${item.unlocked_at ? copy.earnedBadge : `${copy.locked}. ${copy.progressLabel(item.progress, item.target)}`}`}
                  onPress={() => editing ? toggle(item) : onSelect(item)} style={({pressed}) => [styles.achievement, editing && styles.selectable, editing && draft.includes(item.code) && styles.selectedAchievement, {width: `${(100 - (columns - 1) * 3) / columns}%`}, pressed && styles.pressed]}>
                  {editing ? <View style={[styles.checkbox, draft.includes(item.code) && styles.checkboxSelected]}><Text style={styles.checkmark}>{draft.includes(item.code) ? '✓' : ''}</Text></View> : null}
                  <AchievementMedal achievement={item} size={medalSize} />
                  <Text style={styles.itemTitle}>{copy.items[item.code].title}</Text>
                  <Text style={styles.status}>{copy.progressLabel(item.unlocked_at ? item.target : item.progress, item.target)}</Text>
                </Pressable>)}
              </View>
            </View>;
          })}
        </ScrollView>
        {editing ? <View style={styles.selectionFooter}>
          <Text accessibilityLiveRegion="polite" style={styles.selectionCount}>{copy.selectionCount(draft.length)}</Text>
          {draft.length === 4 ? <Text style={styles.description}>{copy.selectionLimit}</Text> : null}
          {saveError ? <Text accessibilityRole="alert" style={styles.selectionError}>{copy.selectionError}</Text> : null}
          <View style={styles.selectionActions}>
            <RaisedButton
              disabled={saving}
              onPress={() => edit(false)}
              label={copy.cancelSelection}
              variant="outlined"
              tone="neutral"
              style={buttonLayout.flex}
            />
            <RaisedButton
              testID="achievement-save-highlights"
              accessibilityState={{busy: saving}}
              disabled={saving}
              onPress={save}
              label={copy.saveHighlights}
              tone="success"
              style={buttonLayout.flex}
            />
          </View>
        </View> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  selectable: {borderWidth: 2, borderColor: challengeTheme.colors.border, paddingTop: 28},
  selectedAchievement: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: challengeTheme.colors.panelSoft},
  checkbox: {position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: challengeTheme.colors.cyanStrong, alignItems: 'center', justifyContent: 'center'},
  checkboxSelected: {backgroundColor: challengeTheme.colors.cyanStrong}, checkmark: {fontSize: 13, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  selectionFooter: {padding: 16, gap: 8, borderTopWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.background},
  selectionCount: {fontSize: 14, fontWeight: '800', color: challengeTheme.colors.text, textAlign: 'center'},
  selectionError: {fontSize: 13, color: challengeTheme.colors.danger, textAlign: 'center'},
  selectionActions: {flexDirection: 'row', gap: 12},
  page: {flex: 1, backgroundColor: challengeTheme.colors.background}, safeArea: {flex: 1},
  topbar: {flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: challengeTheme.colors.border},
  back: {width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}, backLabel: {fontSize: 38, color: challengeTheme.colors.cyanStrong},
  topTitle: {flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center', color: challengeTheme.colors.text}, count: {minWidth: 48, fontSize: 12, fontWeight: '800', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  content: {padding: 20, paddingTop: 22, paddingBottom: 36, gap: 20},
  highlights: {gap: 12, paddingBottom: 4, paddingRight: 2},
  highlight: {alignItems: 'center', gap: 7, padding: 12, paddingTop: 14, borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, backgroundColor: challengeTheme.colors.panel},
  highlightDate: {marginTop: 'auto', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center', color: challengeTheme.colors.muted},
  collectionHeading: {gap: 4}, collectionCount: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, filter: {minHeight: 44, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.border},
  filterActive: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.cyanStrong}, filterLabel: {fontSize: 12, fontWeight: '800', color: challengeTheme.colors.muted}, filterLabelActive: {color: challengeTheme.colors.backgroundDeep},
  section: {gap: 14}, sectionTitle: {fontSize: 21, fontWeight: '900', color: challengeTheme.colors.text}, categoryTitle: {fontSize: 15, fontWeight: '800', color: challengeTheme.colors.muted},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: '3%', rowGap: 22},
  achievement: {alignItems: 'center', gap: 5, paddingVertical: 4, borderRadius: 16},
  itemTitle: {fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center', color: challengeTheme.colors.text},
  description: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted, textAlign: 'center'}, status: {fontSize: 11, lineHeight: 16, fontWeight: '700', color: challengeTheme.colors.muted, textAlign: 'center'},
  notice: {gap: 10, padding: 14, alignItems: 'center'}, pressed: {opacity: 0.7, transform: [{scale: 0.97}]},
});

const buttonLayout = StyleSheet.create({flex: {flex: 1}});
