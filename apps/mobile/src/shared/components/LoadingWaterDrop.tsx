import React, {useEffect, useId} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {cancelAnimation, Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue} from 'react-native-reanimated';
import Svg, {ClipPath, Defs, G, LinearGradient, Path, Stop} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DROP = 'M32 5C26 15 14 26 14 38a18 18 0 0 0 36 0C50 26 38 15 32 5Z';

interface Props {
  size?: number;
  fillValue?: SharedValue<number>;
  fillRange?: number;
  animate?: boolean;
  motionEnabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingWaterDrop({
  size = 40,
  fillValue,
  fillRange = 1,
  animate = true,
  motionEnabled = true,
  accessibilityLabel,
  testID,
  style,
}: Props): React.JSX.Element {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const defaultFill = useSharedValue(0.72);
  const wave = useSharedValue(0);
  const fill = fillValue ?? defaultFill;
  const shouldAnimate = animate && motionEnabled && !reducedMotion;

  useEffect(() => {
    wave.value = 0;
    if (shouldAnimate) wave.value = withRepeat(withTiming(1, {duration: 1200, easing: Easing.linear}), -1, false);
    return () => cancelAnimation(wave);
  }, [shouldAnimate, wave]);

  const liquidProps = useAnimatedProps(() => {
    const level = Math.min(1, Math.max(0, fill.value / fillRange));
    const y = 52 - 32 * level;
    const crest = 5 * Math.sin(wave.value * Math.PI * 2);
    return {d: `M10 ${y} Q21 ${y + crest} 32 ${y} T54 ${y} V58 H10 Z`};
  });

  return <View
    testID={testID}
    accessible={Boolean(accessibilityLabel)}
    accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
    accessibilityLabel={accessibilityLabel}
    accessibilityState={accessibilityLabel ? {busy: true} : undefined}
    style={[styles.container, {width: size, height: size}, style]}>
    <Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}>
      <Defs>
        <ClipPath id={`${id}-drop`}><Path d={DROP} /></ClipPath>
        <LinearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <Stop stopColor="#78F4EF" />
          <Stop offset="1" stopColor="#079BC8" />
        </LinearGradient>
      </Defs>
      <Path d={DROP} fill="#082D43" />
      <G clipPath={`url(#${id}-drop)`}>
        <AnimatedPath animatedProps={liquidProps} fill={`url(#${id}-water)`} />
      </G>
      <Path d={DROP} fill="none" stroke="#A9F1F1" strokeWidth={1.8} />
      <Path d="M25 24 Q19 32 19 38" fill="none" stroke="#D5FFFF" strokeOpacity={0.75} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  </View>;
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center'},
});
