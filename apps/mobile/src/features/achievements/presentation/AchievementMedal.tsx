import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import type {Achievement} from '@aqualino/contracts';
import {achievementImages} from '../../../assets/achievements/achievementImages';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {LevelMedal} from './LevelMedal';

export function AchievementMedal({achievement, size = 88}: {achievement: Achievement; size?: number}): React.JSX.Element {
  const locked = !achievement.unlocked_at;
  const source = achievement.code in achievementImages ? achievementImages[achievement.code as keyof typeof achievementImages] : undefined;
  return (
    <View style={{width: size, height: size}}>
      {source ? <Image source={source} resizeMode="contain" resizeMethod="resize" style={[styles.image, locked && styles.locked]} />
        : <LevelMedal level={achievement.target} size={size} locked={locked} />}
      {locked ? <View style={styles.lock}><AqualinoIcon name="lock" size={12} color={challengeTheme.colors.muted} /></View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  image: {width: '100%', height: '100%'}, locked: {opacity: 0.3},
  lock: {position: 'absolute', right: 2, bottom: 0, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.background, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
});
