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
      <Text numberOfLines={1} style={styles.amount}>{formatNumber(current)} ml</Text>
      <Text numberOfLines={1} style={styles.goal}>meta de {formatNumber(goal)} ml</Text>
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
  container: {
    width: 98, paddingHorizontal: 3, paddingVertical: 2,
  },
  compact: {width: 94},
  amount: {
    fontSize: 14, lineHeight: 18, color: '#F0FBFC', fontWeight: '900',
    textShadowColor: 'rgba(0, 10, 18, 0.95)', textShadowRadius: 4, textShadowOffset: {width: 0, height: 1},
  },
  goal: {
    marginTop: 1, fontSize: 10, lineHeight: 13, color: '#D0E2E6', fontWeight: '700',
    textShadowColor: 'rgba(0, 10, 18, 0.95)', textShadowRadius: 4, textShadowOffset: {width: 0, height: 1},
  },
  track: {
    height: 6, marginTop: 6, borderRadius: 5, overflow: 'hidden',
    backgroundColor: 'rgba(3, 30, 48, 0.8)', borderWidth: 1, borderColor: 'rgba(160, 223, 231, 0.35)',
  },
  fill: {
    height: '100%', borderRadius: 5, backgroundColor: challengeTheme.colors.cyan,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.8, shadowRadius: 4,
    shadowOffset: {width: 0, height: 0}, elevation: 4,
  },
  percentage: {
    marginTop: 4, fontSize: 12, lineHeight: 16, color: '#D4FEFF', fontWeight: '900',
    textShadowColor: 'rgba(0, 10, 18, 0.95)', textShadowRadius: 4, textShadowOffset: {width: 0, height: 1},
  },
});
