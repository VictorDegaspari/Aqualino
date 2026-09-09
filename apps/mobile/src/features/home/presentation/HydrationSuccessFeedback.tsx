import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from './challenge/challengeTheme';

const displayDurationMs = 1400;

interface Props {
  amountMl: number;
  accessibilityLabel: string;
  onDismiss?: () => void;
}

export function HydrationSuccessFeedback({amountMl, accessibilityLabel, onDismiss}: Props): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, {toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true}),
      Animated.delay(850),
      Animated.timing(progress, {toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true}),
    ]);
    animation.start();
    const dismissTimer = onDismiss ? setTimeout(onDismiss, displayDurationMs) : undefined;

    return () => {
      animation.stop();
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [amountMl, onDismiss, progress]);

  return (
    <Animated.View
      testID="hydration-success-feedback"
      accessibilityLiveRegion="polite"
      accessibilityLabel={accessibilityLabel}
      style={[styles.feedback, {
        opacity: progress,
        transform: [
          {translateY: progress.interpolate({inputRange: [0, 1], outputRange: [8, 0]})},
          {scale: progress.interpolate({inputRange: [0, 1], outputRange: [0.78, 1]})},
        ],
      }]}
    >
      <View style={styles.check}><AqualinoIcon name="check" size={22} color="#063541" /></View>
      <Text style={styles.amount}>+{amountMl} ml</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  feedback: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    backgroundColor: challengeTheme.colors.cyanStrong,
  },
  check: {
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12,
    backgroundColor: '#E8FFFF',
  },
  amount: {color: '#063541', fontSize: 13, lineHeight: 18, fontWeight: '900'},
});
