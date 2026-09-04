import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {challengeTheme} from './challengeTheme';

interface Props {
  current: number;
  goal: number;
  percentage: number;
  compact?: boolean;
}

export function WaterProgress({current, goal, percentage, compact = false}: Props): React.JSX.Element {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const animatedPercentage = useSharedValue(safePercentage);

  useEffect(() => {
    animatedPercentage.value = withTiming(safePercentage, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [animatedPercentage, safePercentage]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedPercentage.value}%` as `${number}%`,
  }));

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text numberOfLines={1} style={styles.amount}>
        {formatNumber(current)} <Text style={styles.goal}>/ {formatNumber(goal)} ml</Text>
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
    </View>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

const styles = StyleSheet.create({
  container: {width: 98},
  compact: {width: 94},
  amount: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.cyan, fontWeight: '900'},
  goal: {fontSize: 10, color: '#B4CCE1', fontWeight: '700'},
  track: {
    height: 8, marginTop: 7, borderRadius: 5, overflow: 'hidden',
    backgroundColor: 'rgba(19, 60, 91, 0.78)', borderWidth: 1, borderColor: 'rgba(29, 90, 128, 0.55)',
  },
  fill: {
    height: '100%', borderRadius: 5, backgroundColor: challengeTheme.colors.cyan,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.8, shadowRadius: 4,
    shadowOffset: {width: 0, height: 0}, elevation: 4,
  },
  percentage: {marginTop: 4, fontSize: 15, lineHeight: 19, color: challengeTheme.colors.cyan, fontWeight: '900'},
});
