import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {Achievement} from '@aqualino/contracts';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {featuredAchievements} from '../application/achievementCatalog';
import {AchievementMedal} from './AchievementMedal';
import {achievementCopy, type AchievementCopy} from './achievementCopy';
import {useAchievements} from './useAchievements';

export function ProfileAchievements({onOpen}: {onOpen: () => void}): React.JSX.Element {
  const {items, unlockedCount} = useAchievements();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  return <ProfileAchievementHighlights items={items} unlockedCount={unlockedCount} copy={achievementCopy[locale]} onOpen={onOpen} />;
}

export function ProfileAchievementHighlights({items, unlockedCount, copy, onOpen}: {
  items: Achievement[]; unlockedCount: number; copy: AchievementCopy; onOpen: () => void;
}): React.JSX.Element {
  return (
    <Pressable testID="profile-achievements" accessibilityRole="button" accessibilityLabel={copy.all} accessibilityHint={copy.profileHint}
      onPress={onOpen} style={({pressed}) => [styles.panel, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.heading}><Text style={styles.title}>{copy.title}</Text><Text style={styles.subtitle}>{copy.collectionCount(unlockedCount, items.length)}</Text></View>
        <Text style={styles.arrow}>›</Text>
      </View>
      <View style={styles.medals}>
        {featuredAchievements(items).map(item => <View key={item.code} style={styles.medal}>
          <AchievementMedal achievement={item} size={61} />
          <Text numberOfLines={2} style={[styles.label, !item.unlocked_at && styles.locked]}>{copy.items[item.code].title}</Text>
        </View>)}
      </View>
      <Text style={styles.link}>{copy.all} →</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  panel: {padding: 18, borderRadius: 22, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, heading: {flex: 1},
  title: {fontSize: 20, lineHeight: 26, fontWeight: '900', color: challengeTheme.colors.text}, subtitle: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  arrow: {fontSize: 32, color: challengeTheme.colors.cyanStrong},
  medals: {flexDirection: 'row', gap: 4, marginTop: 18}, medal: {flex: 1, minWidth: 0, alignItems: 'center', gap: 8},
  label: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.text, textAlign: 'center'}, locked: {color: challengeTheme.colors.muted},
  link: {marginTop: 18, fontSize: 12, fontWeight: '900', color: challengeTheme.colors.cyanStrong, textAlign: 'center'}, pressed: {opacity: 0.82},
});
