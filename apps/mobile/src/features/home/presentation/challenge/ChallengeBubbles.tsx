import React, {memo, useEffect, useMemo} from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
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

const bubbles = [
  {left: '5%', size: 8, duration: 9200, phase: 0.16, opacity: 0.42, sway: 6},
  {left: '12%', size: 5, duration: 7100, phase: 0.68, opacity: 0.34, sway: -4},
  {left: '22%', size: 10, duration: 11200, phase: 0.42, opacity: 0.4, sway: 7},
  {left: '34%', size: 6, duration: 8300, phase: 0.86, opacity: 0.3, sway: -5},
  {left: '46%', size: 7, duration: 10100, phase: 0.28, opacity: 0.36, sway: 5},
  {left: '58%', size: 4, duration: 6500, phase: 0.57, opacity: 0.32, sway: -4},
  {left: '69%', size: 9, duration: 10600, phase: 0.76, opacity: 0.44, sway: 6},
  {left: '79%', size: 5, duration: 7400, phase: 0.34, opacity: 0.34, sway: -5},
  {left: '88%', size: 11, duration: 11800, phase: 0.92, opacity: 0.46, sway: 7},
  {left: '95%', size: 6, duration: 8000, phase: 0.51, opacity: 0.36, sway: -4},
] as const;

interface Props {
  viewportHeight: number;
}

export const ChallengeBubbles = memo(function ChallengeBubblesView({viewportHeight}: Props): React.JSX.Element {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bubbles.map((bubble, index) => (
        <Bubble key={`${bubble.left}-${bubble.size}`} config={bubble} index={index} viewportHeight={viewportHeight} />
      ))}
    </View>
  );
});

function Bubble({config, index, viewportHeight}: {config: typeof bubbles[number]; index: number; viewportHeight: number}) {
  const progress = useSharedValue(0);
  const travelDuration = config.duration * 2.25;
  const baseStyle = useMemo<ViewStyle>(() => ({
    left: config.left,
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    opacity: config.opacity,
  }), [config]);

  useEffect(() => {
    progress.value = config.phase;
    progress.value = withSequence(
      withTiming(1, {
        duration: travelDuration * (1 - config.phase),
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      withRepeat(
        withSequence(
          withTiming(0, {duration: 0}),
          withTiming(1, {
            duration: travelDuration,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );
    return () => cancelAnimation(progress);
  }, [config.phase, progress, travelDuration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [viewportHeight + config.size + index * 11, -config.size - 96],
        ),
      },
      {
        translateX: interpolate(
          progress.value,
          [0, 0.22, 0.48, 0.74, 1],
          [0, config.sway, -config.sway * 0.72, config.sway * 0.48, -config.sway * 0.2],
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.bubble, baseStyle, animatedStyle]}>
      <View style={styles.highlight} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', bottom: 0, borderWidth: 1, borderColor: 'rgba(113, 225, 255, 0.72)',
    backgroundColor: 'rgba(18, 132, 194, 0.22)',
  },
  highlight: {position: 'absolute', top: 1, left: 1, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.7)'},
});
