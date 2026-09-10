import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Animated, {cancelAnimation, Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Path} from 'react-native-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppModal} from '../../../shared/components/AppModal';
import {useTranslation} from '../../../shared/i18n/useTranslation';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const circumference = 2 * Math.PI * 88;
const displayDurationMs = 2100;

interface Props {
  amountMl: number;
  accessibilityLabel: string;
  onDismiss?: () => void;
}

export function HydrationSuccessFeedback({amountMl, accessibilityLabel, onDismiss}: Props): React.JSX.Element | null {
  const {t} = useTranslation();
  const {width, height} = useWindowDimensions();
  const size = Math.min(260, width * 0.65, height * 0.42);
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const circle = useSharedValue(reducedMotion ? 1 : 0);
  const check = useSharedValue(reducedMotion ? 1 : 0);
  const exit = useSharedValue(0);
  const message = t('Cada gole é um cuidado com você. Continue assim!', 'Every sip is a little care for yourself. Keep going!', 'Cada sorbo es un cuidado para ti. ¡Sigue así!');

  useEffect(() => {
    setVisible(true);
    circle.value = reducedMotion ? 1 : 0;
    check.value = reducedMotion ? 1 : 0;
    exit.value = 0;
    if (!reducedMotion) {
      circle.value = withTiming(1, {duration: 380, easing: Easing.out(Easing.cubic)});
      check.value = withDelay(220, withTiming(1, {duration: 240, easing: Easing.out(Easing.quad)}));
    }
    exit.value = withDelay(1750, withTiming(1, {duration: reducedMotion ? 0 : 350, reduceMotion: ReduceMotion.Never}), ReduceMotion.Never);
    const timer = setTimeout(() => {setVisible(false); onDismiss?.();}, displayDurationMs);
    return () => {
      clearTimeout(timer);
      cancelAnimation(circle);
      cancelAnimation(check);
      cancelAnimation(exit);
    };
  }, [amountMl, onDismiss, reducedMotion, circle, check, exit]);

  const overlayStyle = useAnimatedStyle(() => ({opacity: 1 - exit.value}));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{scale: reducedMotion ? 1 : 1 + exit.value * 0.035}, {translateY: reducedMotion ? 0 : -exit.value * 8}],
  }));
  const circleProps = useAnimatedProps(() => ({strokeDashoffset: circumference * (1 - circle.value)}));
  const checkProps = useAnimatedProps(() => ({strokeDashoffset: 110 * (1 - check.value), opacity: check.value}));

  if (!visible) return null;

  return (
    <AppModal dismissible={false} onRequestClose={() => undefined}>
      <Animated.View testID="hydration-success-feedback" style={[styles.overlay, overlayStyle]}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View accessible accessibilityRole="alert" accessibilityLiveRegion="assertive" accessibilityLabel={`${accessibilityLabel}. ${message}`} style={[styles.content, contentStyle]}>
            <View style={styles.artwork}>
              <Svg width={size} height={size} viewBox="0 0 200 200" accessible={false}>
                <Circle cx={100} cy={100} r={88} fill="#103E43" stroke="#245B58" strokeWidth={5} />
                <AnimatedCircle cx={100} cy={100} r={88} fill="none" stroke="#8FDBC0" strokeWidth={5} strokeLinecap="round" strokeDasharray={[circumference, circumference]} rotation={-90} origin="100, 100" animatedProps={circleProps} />
                <AnimatedPath d="m57 101 29 29 58-61" fill="none" stroke="#B6FFE0" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[110, 110]} animatedProps={checkProps} />
              </Svg>
            </View>
            <Text style={styles.amount}>+{amountMl} ml</Text>
            <Text style={styles.message}>{message}</Text>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0, 17, 30, 0.97)'},
  safeArea: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28},
  content: {alignItems: 'center', width: '100%', maxWidth: 420, gap: 16},
  artwork: {alignItems: 'center', justifyContent: 'center'},
  amount: {color: '#B6FFE0', fontSize: 32, lineHeight: 40, fontWeight: '900', textAlign: 'center'},
  message: {color: '#E6F5F1', fontSize: 18, lineHeight: 27, fontWeight: '600', textAlign: 'center'},
});
