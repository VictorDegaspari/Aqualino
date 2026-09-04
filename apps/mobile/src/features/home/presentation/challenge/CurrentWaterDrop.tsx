import React, {useEffect, useMemo} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {ChallengeAsset} from './ChallengeAsset';

interface Props {
  scale: number;
}

export function CurrentWaterDrop({scale}: Props): React.JSX.Element {
  const pulse = useSharedValue(0);
  const size = useMemo(() => ({width: 120 * scale, height: 147 * scale}), [scale]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1450, easing: Easing.inOut(Easing.ease)}),
        withTiming(0, {duration: 1450, easing: Easing.inOut(Easing.ease)}),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.94, 1]),
    transform: [{scale: interpolate(pulse.value, [0, 1], [0.985, 1.025])}],
  }));

  return (
    <Animated.View style={[styles.glow, animatedStyle]}>
      <ChallengeAsset name="currentDrop" style={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#00F1FA', shadowOpacity: 0.78, shadowRadius: 16,
    shadowOffset: {width: 0, height: 0}, elevation: 12,
  },
});
