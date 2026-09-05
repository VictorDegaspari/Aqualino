import React, {useEffect, useId, useMemo} from 'react';
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Defs, Ellipse, LinearGradient, Path, Rect, Stop} from 'react-native-svg';
import {appCopy, type AppLocale} from '../../../shared/i18n/appLocale';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

const GLASS_HEIGHT = 200;
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
  const id = useId();
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
    const liquidRotation = clamp(-roll * RADIANS_TO_DEGREES, -16, 16);

    return {
      height,
      transform: [
        {translateX: 0},
        {translateY: 0},
        {rotateZ: withSpring(`${liquidRotation}deg`, {damping: 22, stiffness: 110, mass: 0.7})},
      ],
    };
  });
  const backWaveStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [-7, 7])},
      {translateY: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [1, -1])},
    ],
  }));
  const frontWaveStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [6, -6])},
      {translateY: reduceMotion ? 0 : interpolate(waveProgress.value, [0, 1], [-1, 1])},
    ],
  }));

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${comparison.status}. ${comparison.comparison}`}
      style={styles.card}>
      <View style={styles.content}>
        <View style={styles.vessel} pointerEvents="none" accessible={false}>
          <GlassFinish id={id} layer="back" />
          <View style={styles.glass}>
            {comparison.visualLevel > 0 ? <Animated.View testID="history-water-liquid" style={[styles.liquid, liquidStyle]}>
              <View style={styles.liquidBody}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id={`${id}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0" stopColor="#399FB6" />
                      <Stop offset="0.6" stopColor="#216D8B" />
                      <Stop offset="1" stopColor="#12475F" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill={`url(#${id}-body)`} />
                </Svg>
              </View>
              <Animated.View style={[styles.wave, backWaveStyle]}>
                <WaterWave id={id} variant="back" />
              </Animated.View>
              <Animated.View style={[styles.wave, frontWaveStyle]}>
                <WaterWave id={id} variant="front" />
              </Animated.View>
              <View style={[styles.bubble, styles.bubbleOne]} />
              <View style={[styles.bubble, styles.bubbleTwo]} />
            </Animated.View> : null}
          </View>
          <GlassFinish id={id} layer="front" />
        </View>
        <View style={styles.waterContent}>
          <Text style={styles.waterEyebrow}>{variant === 'goal' ? gaugeCopy.eyebrow : isToday ? 'SEU NÍVEL HOJE' : 'SEU NÍVEL NESSE DIA'}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.waterAmount}>{formatMl(safeTotalMl, locale)}</Text>
          <Text style={styles.waterStatus}>{comparison.status}</Text>
          <Text style={styles.waterComparison}>{comparison.comparison}</Text>
        </View>
      </View>
      <Text style={styles.hint}>{variant === 'goal' ? gaugeCopy.hint : 'Incline o celular para movimentar a água'}</Text>
    </View>
  );
}

function GlassFinish({id, layer}: {id: string; layer: 'back' | 'front'}): React.JSX.Element {
  const body = 'M10 14 H134 V172 C134 195.2 115.2 214 92 214 H52 C28.8 214 10 195.2 10 172 Z';
  return (
    <Svg width={144} height={232} viewBox="0 0 144 232" style={StyleSheet.absoluteFill}>
      {layer === 'back' ? (
        <>
          <Defs>
            <LinearGradient id={`${id}-glass`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop stopColor="#98D8DE" stopOpacity={0.13} />
              <Stop offset="0.5" stopColor="#4A93A5" stopOpacity={0.03} />
              <Stop offset="1" stopColor="#82BFC9" stopOpacity={0.12} />
            </LinearGradient>
          </Defs>
          <Ellipse cx={72} cy={223} rx={52} ry={5} fill="#04151D" fillOpacity={0.4} />
          <Path d={body} fill={`url(#${id}-glass)`} />
          <Ellipse cx={72} cy={14} rx={62} ry={9} fill="#0D2835" stroke="#69ADBA" strokeOpacity={0.3} />
        </>
      ) : (
        <>
          <Defs>
            <LinearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop stopColor="#C4EAEC" stopOpacity={0.8} />
              <Stop offset="0.45" stopColor="#84B9C4" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#B2D9DE" stopOpacity={0.65} />
            </LinearGradient>
            <LinearGradient id={`${id}-reflection`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop stopColor="#D8F3F2" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#D8F3F2" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={body} fill="none" stroke={`url(#${id}-edge)`} strokeWidth={1.5} />
          <Path d="M18 30 H39 V185 Q39 199 48 205 Q18 201 18 170 Z" fill={`url(#${id}-reflection)`} />
          <Path d="M20 39 V150" fill="none" stroke="#E2F7F6" strokeOpacity={0.33} strokeWidth={3} strokeLinecap="round" />
          <Path d="M125 49 V167 Q125 194 108 201" fill="none" stroke="#B6DDE2" strokeOpacity={0.22} strokeWidth={2} strokeLinecap="round" />
          <Path d="M114 64 H122 M117 89 H122 M114 114 H122 M117 139 H122 M114 164 H122" fill="none" stroke="#C7E9EA" strokeOpacity={0.4} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M41 202 Q72 212 103 202" fill="none" stroke="#C3E7EB" strokeOpacity={0.35} strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={72} cy={14} rx={62} ry={9} fill="none" stroke="#A9D4DB" strokeOpacity={0.65} strokeWidth={1.5} />
          <Path d="M12 15 C23 26 121 26 132 15" fill="none" stroke="#D9F2F1" strokeOpacity={0.62} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

interface WaterWaveProps {
  id: string;
  variant: 'back' | 'front';
}

function WaterWave({id, variant}: WaterWaveProps): React.JSX.Element {
  const isBack = variant === 'back';
  const path = isBack
    ? 'M0 26 C60 4 120 48 180 26 S300 4 360 26 S480 48 540 26 S660 4 720 26 L720 320 L0 320 Z'
    : 'M0 32 C60 50 120 14 180 32 S300 50 360 32 S480 14 540 32 S660 50 720 32 L720 320 L0 320 Z';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 720 64" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-water-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0" stopColor={isBack ? '#A4E1E3' : '#76CBD4'} stopOpacity={isBack ? 0.7 : 0.94} />
          <Stop offset="0.55" stopColor={isBack ? '#61B9C9' : '#399FB6'} />
          <Stop offset="1" stopColor="#399FB6" />
        </LinearGradient>
      </Defs>
      <Path d={path} fill={`url(#${id}-water-${variant})`} />
      <Path
        d={path.split(' L720')[0]}
        fill="none"
        stroke={isBack ? '#D9F1EF' : '#B1E5E6'}
        strokeOpacity={isBack ? 0.4 : 0.55}
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
  card: {padding: 16, borderRadius: 26, backgroundColor: 'rgba(12, 34, 46, 0.78)', borderWidth: 1, borderColor: 'rgba(105, 173, 186, 0.22)'},
  content: {flexDirection: 'row', alignItems: 'center', gap: 14},
  vessel: {width: 144, height: 232},
  glass: {
    position: 'absolute', top: 14, left: 10, width: 124, height: GLASS_HEIGHT, overflow: 'hidden',
    borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 42, borderBottomRightRadius: 42,
  },
  liquid: {
    position: 'absolute', zIndex: 1, bottom: -LIQUID_OVERSCAN, left: '-40%', width: '180%',
    transformOrigin: '50% 0%',
  },
  liquidBody: {position: 'absolute', top: 14, right: 0, bottom: 0, left: 0, backgroundColor: '#216D8B'},
  wave: {position: 'absolute', top: -16, height: 32, right: '-7%', left: '-7%'},
  bubble: {
    position: 'absolute', borderRadius: 99, borderWidth: 1,
    borderColor: 'rgba(218, 253, 255, 0.38)', backgroundColor: 'rgba(196, 250, 255, 0.06)',
  },
  bubbleOne: {top: 46, left: '43%', width: 6, height: 6},
  bubbleTwo: {top: 95, left: '59%', width: 4, height: 4},
  waterContent: {flex: 1, minWidth: 0, gap: 6, paddingBottom: 12},
  waterEyebrow: {fontFamily: typography.family, fontSize: 9, lineHeight: 14, letterSpacing: 1.1, fontWeight: '800', color: challengeTheme.colors.muted},
  waterAmount: {fontFamily: typography.family, fontSize: 28, lineHeight: 37, fontWeight: '900', color: challengeTheme.colors.cyanStrong, fontVariant: ['tabular-nums']},
  waterStatus: {fontFamily: typography.family, fontSize: 16, lineHeight: 22, fontWeight: '800', color: challengeTheme.colors.text},
  waterComparison: {fontFamily: typography.family, fontSize: 12, lineHeight: 18, fontWeight: '600', color: challengeTheme.colors.muted},
  hint: {fontFamily: typography.family, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(105, 173, 186, 0.12)', fontSize: 11, lineHeight: 17, fontWeight: '600', color: challengeTheme.colors.muted, textAlign: 'center'},
});
