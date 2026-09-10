import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Path, Rect} from 'react-native-svg';
import type {Achievement} from '@aqualino/contracts';
import {AchievementArtwork} from './AchievementArtwork';
import {LevelMedal} from './LevelMedal';

export function AchievementMedal({achievement, size = 88}: {achievement: Achievement; size?: number}): React.JSX.Element {
  const locked = !achievement.unlocked_at;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{width: size, height: size}}>
      {achievement.category === 'levels' ? <LevelMedal level={achievement.target} size={size} locked={locked} />
        : <View style={locked && styles.locked}><AchievementArtwork code={achievement.code} target={achievement.target} size={size} /></View>}
      {locked ? <View style={styles.lock}><Svg width={12} height={12} viewBox="0 0 16 16"><Path d="M4 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="#768A95" strokeWidth="2" /><Rect x="2" y="7" width="12" height="9" rx="2" fill="#768A95" /></Svg></View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  locked: {opacity: 0.5},
  lock: {position: 'absolute', right: 0, bottom: 3, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F6F8', borderWidth: 2, borderColor: '#FFFFFF'},
});
