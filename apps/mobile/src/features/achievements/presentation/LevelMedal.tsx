import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {levelColor} from '../../../shared/components/LevelBadge';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export function LevelMedal({level, size, locked}: {level: number; size: number; locked: boolean}): React.JSX.Element {
  const color = levelColor(level);
  return <View testID={`level-medal-${level}`} style={[{width: size, height: size}, locked && styles.locked]}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Path d="M26 60 19 93 33 86 43 97 49 65 M51 65 57 97 67 86 81 93 74 60" fill={challengeTheme.colors.panelSoft} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
    <View style={[styles.outer, {width: size * 0.78, height: size * 0.78, borderRadius: size, borderColor: color}]}>
      <View style={[styles.inner, {borderColor: color}]}>
        <AqualinoIcon name="water" size={size * 0.16} color={color} />
        <Text style={[styles.number, {fontSize: size * 0.28, lineHeight: size * 0.32, color}]}>{level}</Text>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  outer: {alignSelf: 'center', marginTop: 2, padding: 4, borderWidth: 2, backgroundColor: challengeTheme.colors.backgroundDeep},
  inner: {flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 100},
  number: {fontWeight: '900', fontVariant: ['tabular-nums']},
  locked: {opacity: 0.35},
});
