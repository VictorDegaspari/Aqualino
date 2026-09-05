import React, {useEffect, useId, useMemo} from 'react';
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
import Svg, {Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';

// Keep the original drop silhouette; the liquid level spans its tip to its base.
const DROP_PATH = 'M75 12C58 38 34 61 34 91c0 27 18 48 41 48s41-21 41-48c0-30-24-53-41-79z';
const DROP_TOP = 12;
const DROP_BOTTOM = 139;

interface Props {
  scale: number;
  totalMl: number;
  goalMl: number;
  motionEnabled?: boolean;
}

export function CurrentWaterDrop({scale, totalMl, goalMl, motionEnabled = true}: Props): React.JSX.Element {
  const pulse = useSharedValue(0);
  const size = useMemo(() => ({width: 120 * scale, height: 147 * scale}), [scale]);
  const id = useId();
  const fillRatio = Number.isFinite(totalMl) && Number.isFinite(goalMl) && goalMl > 0
    ? Math.min(1, Math.max(0, totalMl / goalMl))
    : 0;
  const waterHeight = (DROP_BOTTOM - DROP_TOP) * fillRatio;
  const waterY = DROP_BOTTOM - waterHeight;

  useEffect(() => {
    if (!motionEnabled) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
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
  }, [motionEnabled, pulse]);

  const animatedStyle = useAnimatedStyle(() => motionEnabled ? {
    opacity: interpolate(pulse.value, [0, 1], [0.94, 1]),
    transform: [{scale: interpolate(pulse.value, [0, 1], [0.985, 1.025])}],
  } : {opacity: 1, transform: [{scale: 1}]} );

  return (
    <Animated.View testID="current-water-drop" style={[styles.glow, animatedStyle]}>
      <Svg {...size} viewBox="0 0 150 184" pointerEvents="none" accessible={false}>
        <Defs>
          <LinearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
            <Stop stopColor="#56F9FF" stopOpacity={0.12} />
            <Stop offset="0.42" stopColor="#00C7D5" stopOpacity={0.04} />
            <Stop offset="1" stopColor="#006BAA" stopOpacity={0.16} />
          </LinearGradient>
          <LinearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <Stop stopColor="#34F4F2" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#008ACB" stopOpacity={0.9} />
          </LinearGradient>
          <RadialGradient id={`${id}-platform`} cx="50%" cy="40%" r="60%">
            <Stop stopColor="#32EDFF" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#006DD1" stopOpacity={0} />
          </RadialGradient>
          <ClipPath id={`${id}-drop`}>
            <Path d={DROP_PATH} />
          </ClipPath>
          <ClipPath id={`${id}-water`}>
            <Rect x={20} y={waterY} width={110} height={waterHeight} />
          </ClipPath>
        </Defs>

        <Ellipse cx={75} cy={156} rx={62} ry={20} fill={`url(#${id}-platform)`} />
        <Ellipse cx={75} cy={154} rx={55} ry={15} fill="none" stroke="#008CE8" strokeWidth={3} opacity={0.72} />
        <Ellipse cx={75} cy={154} rx={41} ry={10} fill="none" stroke="#20D7F4" strokeWidth={2} opacity={0.85} />
        <Path d={DROP_PATH} fill="none" stroke="#00F1FA" strokeWidth={15} strokeOpacity={0.08} />
        <Path d={DROP_PATH} fill="none" stroke="#00F1FA" strokeWidth={10} strokeOpacity={0.16} />
        <Path d={DROP_PATH} fill="#031E34" fillOpacity={0.9} />
        <Path d={DROP_PATH} fill={`url(#${id}-glass)`} />

        {fillRatio > 0 ? (
          <G clipPath={`url(#${id}-drop)`}>
            <Rect
              testID="current-water-drop-liquid"
              x={20}
              y={waterY}
              width={110}
              height={waterHeight}
              fill={`url(#${id}-liquid)`}
            />
            <G clipPath={`url(#${id}-water)`}>
              {fillRatio < 1 ? (
                <Path
                  d={`M24 ${waterY + 2} C44 ${waterY - 3} 59 ${waterY + 7} 80 ${waterY + 2} S113 ${waterY - 3} 133 ${waterY + 2}`}
                  fill="none"
                  stroke="#D0FFFF"
                  strokeWidth={2}
                  opacity={0.82}
                />
              ) : null}
              <Circle cx={60} cy={119} r={3} fill="#BFFFFF" opacity={0.62} />
              <Circle cx={83} cy={127} r={2} fill="#DDFFFF" opacity={0.5} />
              <Circle cx={96} cy={112} r={4} fill="#9DFFFF" opacity={0.5} />
            </G>
          </G>
        ) : null}

        <Path d={DROP_PATH} fill="none" stroke="#49FBFF" strokeWidth={7} />
        <Path d={DROP_PATH} fill="none" stroke="#B4FFFF" strokeWidth={2.2} />
        <Path d="M60 35c-11 14-18 27-19 39" fill="none" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" opacity={0.62} />
        <Path d="M91 35c8 8 13 17 16 27" fill="none" stroke="#AFFFFF" strokeWidth={2.5} strokeLinecap="round" opacity={0.54} />
        <Circle cx={122} cy={49} r={4} fill="#58F5FF" />
        <Circle cx={129} cy={38} r={2.2} fill="#D8FFFF" />
        <Circle cx={23} cy={72} r={3} fill="#20DFFF" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#00F1FA', shadowOpacity: 0.78, shadowRadius: 16,
    shadowOffset: {width: 0, height: 0}, elevation: 12,
  },
});
