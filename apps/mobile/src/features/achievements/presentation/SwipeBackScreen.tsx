import React, {useCallback, useEffect, useRef} from 'react';
import {BackHandler, StyleSheet, useWindowDimensions} from 'react-native';
import {GestureDetector, usePanGesture} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {shouldCompleteSwipe} from '../application/swipeBack';

export function SwipeBackScreen({children, onBack}: {children: (close: () => void) => React.ReactNode; onBack: () => void}): React.JSX.Element {
  const {width} = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const translation = useSharedValue(reducedMotion ? 0 : width);
  const closing = useSharedValue(false);
  const start = useSharedValue(0);
  const finished = useRef(false);
  const finish = useCallback(() => {if (!finished.current) {finished.current = true; onBack();}}, [onBack]);
  const close = useCallback(() => {
    if (closing.value) return;
    closing.value = true;
    translation.value = withTiming(width, {duration: reducedMotion ? 0 : 220}, complete => {if (complete) scheduleOnRN(finish);});
  }, [closing, finish, reducedMotion, translation, width]);

  useEffect(() => {
    translation.value = withTiming(0, {duration: reducedMotion ? 0 : 260});
    return () => cancelAnimation(translation);
  }, [reducedMotion, translation, width]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {close(); return true;});
    return () => subscription.remove();
  }, [close]);

  const gesture = usePanGesture({
    testID: 'achievements-back-gesture',
    activeOffsetX: 12, failOffsetY: [-16, 16], maxPointers: 1,
    onActivate: () => {
      if (closing.value) return;
      cancelAnimation(translation);
      start.value = translation.value;
    },
    onUpdate: event => {
      if (!closing.value) translation.value = Math.max(0, Math.min(width, start.value + event.translationX));
    },
    onDeactivate: event => {
      if (closing.value) return;
      if (!event.canceled && shouldCompleteSwipe(translation.value, event.velocityX, width)) {
        closing.value = true;
        translation.value = withTiming(width, {duration: reducedMotion ? 0 : 180}, complete => {if (complete) scheduleOnRN(finish);});
      } else {
        translation.value = withSpring(0, {damping: 24, stiffness: 240, overshootClamping: true});
      }
    },
  });
  const panelStyle = useAnimatedStyle(() => ({transform: [{translateX: translation.value}]}));
  const dimStyle = useAnimatedStyle(() => ({opacity: 0.25 * (1 - translation.value / width)}));
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View testID="achievements-swipe-panel" style={[styles.panel, panelStyle]}>{children(close)}</Animated.View>
      </GestureDetector>
    </>
  );
}
const styles = StyleSheet.create({panel: {flex: 1}, dim: {backgroundColor: '#000000'}});
