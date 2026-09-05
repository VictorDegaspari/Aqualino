import React, {useEffect, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {appCopy, type AppLocale} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

const GLASS_HEIGHT = 224;
const LIQUID_OVERSCAN = 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

interface Props {
  totalMl: number;
  goalMl?: number;
  isToday?: boolean;
  variant?: 'history' | 'goal';
  locale?: AppLocale;
}

export function HydrationWaterGauge({totalMl, goalMl, isToday = true, variant = 'history', locale = 'pt-BR'}: Props): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const waveProgress = useSharedValue(0);
  const rotation = useAnimatedSensor(SensorType.ROTATION, {
    interval: 32,
    adjustToInterfaceOrientation: true,
  });
  const safeTotalMl = Number.isFinite(totalMl) ? Math.max(0, totalMl) : 0;
  const comparison = useMemo(
    () => variant === 'goal' ? createGoalPreview(safeTotalMl, locale) : createComparison(safeTotalMl, goalMl),
    [goalMl, locale, safeTotalMl, variant],
  );
  const gaugeCopy = appCopy[locale].goalGauge;
  const level = useSharedValue(comparison.visualLevel);

  useEffect(() => {
    level.value = reduceMotion ? comparison.visualLevel : withTiming(comparison.visualLevel, {duration: 450});
  }, [comparison.visualLevel, level, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(waveProgress);
      waveProgress.value = 0;
      return;
    }

    waveProgress.value = withRepeat(
      withTiming(1, {duration: 2400, easing: Easing.inOut(Easing.sin)}),
      -1,
      true,
    );

    return () => cancelAnimation(waveProgress);
  }, [reduceMotion, waveProgress]);

  const liquidStyle = useAnimatedStyle(() => {
    const height = GLASS_HEIGHT * (level.value / 100) + LIQUID_OVERSCAN;
    if (reduceMotion) {
      return {height, transform: [{translateX: 0}, {translateY: 0}, {rotateZ: '0deg'}]};
    }

    const roll = rotation.sensor.value.roll;
    const pitch = Math.abs(rotation.sensor.value.pitch);
    const liquidRotation = clamp(-roll * RADIANS_TO_DEGREES, -28, 28);
    const drinkingTilt = clamp((pitch - 0.35) / 0.95, 0, 1);

    return {
      height,
      transform: [
        {translateX: clamp(roll * 12, -10, 10)},
        {translateY: drinkingTilt * 30},
        {rotateZ: `${liquidRotation}deg`},
      ],
    };
  });
  const backWaveStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [-12, 12])},
      {translateY: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [1, -2])},
    ],
  }));
  const frontWaveStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [10, -10])},
      {translateY: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [-1, 2])},
    ],
  }));

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${comparison.status}. ${comparison.comparison}`}
      style={styles.card}>
      <View style={styles.glassShadow}>
        <View style={styles.glass}>
          {comparison.visualLevel > 0 ? <Animated.View testID="history-water-liquid" style={[styles.liquid, liquidStyle]}>
            <View style={styles.liquidBody}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`water-body-${variant}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#079BD7" />
                    <Stop offset="1" stopColor="#0563B4" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#water-body-${variant})`} />
              </Svg>
            </View>
            <Animated.View style={[styles.wave, backWaveStyle]}>
              <WaterWave variant="back" />
            </Animated.View>
            <Animated.View style={[styles.wave, frontWaveStyle]}>
              <WaterWave variant="front" />
            </Animated.View>
            <View style={[styles.bubble, styles.bubbleOne]} />
            <View style={[styles.bubble, styles.bubbleTwo]} />
            <View style={[styles.bubble, styles.bubbleThree]} />
          </Animated.View> : null}
          <View pointerEvents="none" style={styles.waterContent}>
            <Text style={styles.waterEyebrow}>{variant === 'goal' ? gaugeCopy.eyebrow : isToday ? 'SEU NÍVEL HOJE' : 'SEU NÍVEL NESSE DIA'}</Text>
            <Text style={styles.waterStatus}>{comparison.status}</Text>
            <Text style={styles.waterAmount}>{formatMl(safeTotalMl, locale)}</Text>
            <Text style={styles.waterComparison}>{comparison.comparison}</Text>
          </View>
          <View pointerEvents="none" style={styles.glassShine} />
          <View pointerEvents="none" style={styles.glassRim} />
        </View>
      </View>
      <Text style={styles.hint}>{variant === 'goal' ? gaugeCopy.hint : 'Incline o celular para movimentar a água'}</Text>
    </View>
  );
}

interface WaterWaveProps {
  variant: 'back' | 'front';
}

function WaterWave({variant}: WaterWaveProps): React.JSX.Element {
  const isBack = variant === 'back';
  const path = isBack
    ? 'M0 26 C60 4 120 48 180 26 S300 4 360 26 S480 48 540 26 S660 4 720 26 L720 320 L0 320 Z'
    : 'M0 32 C60 50 120 14 180 32 S300 50 360 32 S480 14 540 32 S660 50 720 32 L720 320 L0 320 Z';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 720 64" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`water-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={isBack ? '#86F6FF' : '#18DDED'} stopOpacity={isBack ? 0.7 : 0.94} />
          <Stop offset="0.42" stopColor={isBack ? '#21C9EC' : '#079BD7'} stopOpacity={isBack ? 0.72 : 0.96} />
          <Stop offset="1" stopColor="#0563B4" stopOpacity={isBack ? 0.76 : 0.98} />
        </LinearGradient>
      </Defs>
      <Path d={path} fill={`url(#water-${variant})`} />
      <Path
        d={path.split(' L720')[0]}
        fill="none"
        stroke={isBack ? '#D9FEFF' : '#A3FAFF'}
        strokeOpacity={isBack ? 0.55 : 0.72}
        strokeWidth={isBack ? 3 : 2}
      />
    </Svg>
  );
}

function createComparison(totalMl: number, goalMl?: number): {status: string; comparison: string; visualLevel: number} {
  if (!goalMl || !Number.isFinite(goalMl) || goalMl <= 0) {
    return {status: totalMl > 0 ? 'Em progresso' : 'Ainda sem registros', comparison: 'Seu consumo de água neste dia.', visualLevel: 0};
  }
  const percentage = (totalMl / goalMl) * 100;
  const visualLevel = clamp(percentage, 0, 100);
  const status = totalMl === 0
    ? 'Ainda sem registros'
    : percentage >= 100
      ? 'Meta atingida!'
      : percentage >= 75
        ? 'Quase na meta'
        : percentage >= 45
          ? 'Em progresso'
          : 'Primeiras gotas';

  return {
    status,
    visualLevel,
    comparison: `${Math.floor(percentage)}% da meta de ${formatMl(goalMl)}.`,
  };
}

function createGoalPreview(goalMl: number, locale: AppLocale): {status: string; comparison: string; visualLevel: number} {
  const copy = appCopy[locale].goalGauge;
  return {
    status: copy.status,
    comparison: copy.comparison,
    visualLevel: clamp(30 + (goalMl / 3000) * 58, 30, 92),
  };
}

function formatMl(value: number, locale: AppLocale = 'pt-BR'): string {
  return `${new Intl.NumberFormat(locale).format(value)} ml`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

const styles = StyleSheet.create({
  card: {alignItems: 'center', gap: 9},
  glassShadow: {
    width: '100%', height: GLASS_HEIGHT, borderRadius: 30,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: {width: 0, height: 7}, elevation: 7,
  },
  glass: {
    width: '100%', height: GLASS_HEIGHT, overflow: 'hidden', borderRadius: 30,
    borderWidth: 2, borderColor: 'rgba(121, 234, 255, 0.72)', backgroundColor: 'rgba(7, 40, 73, 0.54)',
  },
  liquid: {
    position: 'absolute', zIndex: 1, bottom: -LIQUID_OVERSCAN, left: '-40%', width: '180%',
    transformOrigin: '50% 0%',
  },
  liquidBody: {position: 'absolute', top: 16, right: 0, bottom: 0, left: 0, backgroundColor: '#0563B4'},
  wave: {position: 'absolute', top: -16, height: 32, right: '-7%', left: '-7%'},
  bubble: {
    position: 'absolute', borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(218, 253, 255, 0.62)', backgroundColor: 'rgba(196, 250, 255, 0.16)',
  },
  bubbleOne: {top: 64, left: '34%', width: 10, height: 10},
  bubbleTwo: {top: 112, left: '61%', width: 6, height: 6},
  bubbleThree: {top: 154, left: '46%', width: 14, height: 14},
  waterContent: {
    position: 'absolute', zIndex: 3, top: 26, right: 30, left: 30, alignItems: 'center', gap: 2,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0, 27, 55, 0.32)',
  },
  waterEyebrow: {fontSize: 10, lineHeight: 13, letterSpacing: 0.9, fontWeight: '900', color: 'rgba(181, 248, 255, 0.88)'},
  waterStatus: {fontSize: 21, lineHeight: 27, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  waterAmount: {fontSize: 18, lineHeight: 23, fontWeight: '900', color: '#97F8FF'},
  waterComparison: {fontSize: 12, lineHeight: 17, fontWeight: '700', color: 'rgba(227, 252, 255, 0.9)', textAlign: 'center'},
  glassShine: {position: 'absolute', zIndex: 4, top: 18, left: 16, width: 4, height: 92, borderRadius: 4, backgroundColor: 'rgba(211, 252, 255, 0.48)'},
  glassRim: {position: 'absolute', zIndex: 4, top: 7, right: 18, left: 18, height: 1, backgroundColor: 'rgba(225, 254, 255, 0.5)'},
  hint: {fontSize: 12, lineHeight: 17, fontWeight: '700', color: challengeTheme.colors.muted},
});
