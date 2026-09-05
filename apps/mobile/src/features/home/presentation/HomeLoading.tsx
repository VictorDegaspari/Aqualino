import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import {challengeTheme} from './challenge/challengeTheme';

export function HomeLoading({motionEnabled}: {motionEnabled: boolean}): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const floating = useSharedValue(0);
  const animate = motionEnabled && !reducedMotion;

  useEffect(() => {
    floating.value = 0;
    if (animate) {
      floating.value = withRepeat(withTiming(1, {duration: 1200, easing: Easing.inOut(Easing.ease)}), -1, true);
    }
    return () => cancelAnimation(floating);
  }, [animate, floating]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{translateY: animate ? -8 * floating.value : 0}, {scale: animate ? 1 + floating.value * 0.025 : 1}],
  }));

  return <SafeAreaView style={styles.page}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando hidratação" accessibilityState={{busy: true}} style={styles.content}>
      <Animated.Image
        source={require('../../../assets/mascot/static/loading_aqualino.webp')}
        resizeMode="contain" resizeMethod="resize" accessible={false}
        style={[styles.mascot, mascotStyle]}
      />
      <Text style={styles.label}>Carregando sua hidratação…</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: challengeTheme.colors.background},
  content: {alignItems: 'center', gap: 22},
  mascot: {width: 208, height: 208},
  label: {fontSize: 14, lineHeight: 20, fontWeight: '600', color: challengeTheme.colors.muted, textAlign: 'center'},
});
