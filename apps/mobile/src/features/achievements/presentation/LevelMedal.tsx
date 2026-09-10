import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {LevelAchievementCode} from '@aqualino/contracts';
import {AchievementArtwork} from './AchievementArtwork';

export function LevelMedal({level, size, locked}: {level: number; size: number; locked: boolean}): React.JSX.Element {
  return <View testID={`level-medal-${level}`} style={[{width: size, height: size}, locked && styles.locked]}>
    <AchievementArtwork code={`level_${level}` as LevelAchievementCode} target={level} size={size} />
  </View>;
}

const styles = StyleSheet.create({locked: {opacity: 0.5}});
