import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance, type ScrollViewProps} from 'react-native';
import {GestureDetector, GestureStateManager, useNativeGesture, usePanGesture} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {haptics} from '../../../shared/device/haptics';
import {HomeRefreshIndicator, type HomeRefreshPhase} from './HomeRefreshIndicator';

const REFRESH_DISTANCE = 64;
const LOADING_HEIGHT = 84;
const MAX_PULL = 108;

interface Props extends Omit<ScrollViewProps, 'refreshControl' | 'refreshing' | 'onRefresh'> {
  ref?: React.Ref<ScrollViewInstance>;
  onRefresh: () => Promise<unknown> | void;
  motionEnabled?: boolean;
}

export function HomeRefreshScrollView({ref, onRefresh, motionEnabled = true, onScroll, children, style, ...props}: Props): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<HomeRefreshPhase>('idle');
  const pull = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const start = useSharedValue({x: 0, y: 0});
  const dragging = useSharedValue(false);
  const ready = useSharedValue(false);
  const busy = useSharedValue(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const duration = reducedMotion ? 0 : 240;

  const dismiss = useCallback(() => {
    pull.value = withTiming(0, {duration}, finished => {
      if (finished) scheduleOnRN(setPhase, 'idle');
    });
  }, [duration, pull]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(errorTimeout.current);
      cancelAnimation(pull);
    };
  }, [pull]);

  const beginPull = useCallback(() => {
    clearTimeout(errorTimeout.current);
    setPhase('pulling');
  }, []);
  const markReady = useCallback((isReady: boolean) => {
    setPhase(isReady ? 'ready' : 'pulling');
    if (isReady) haptics.selection();
  }, []);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setPhase('refreshing');
    let failed = false;
    try {
      await onRefresh();
    } catch {
      failed = true;
    } finally {
      pending.current = false;
      if (mounted.current) {
        busy.value = false;
        if (failed) {
          setPhase('error');
          errorTimeout.current = setTimeout(dismiss, 2200);
        } else {
          dismiss();
        }
      }
    }
  }, [busy, dismiss, onRefresh]);

  const gesture = usePanGesture({
    testID: 'home-refresh-gesture',
    enabled: motionEnabled,
    manualActivation: true,
    maxPointers: 1,
    onTouchesDown: event => {
      const touch = event.allTouches[0];
      if (!touch || busy.value || scrollY.value > 1 || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      start.value = {x: touch.absoluteX, y: touch.absoluteY};
    },
    onTouchesMove: event => {
      if (dragging.value) return;
      const touch = event.allTouches[0];
      if (!touch || busy.value || scrollY.value > 1 || event.numberOfTouches !== 1) {
        GestureStateManager.fail(event.handlerTag);
        return;
      }
      const dx = Math.abs(touch.absoluteX - start.value.x);
      const dy = touch.absoluteY - start.value.y;
      if (dy < -8 || dx > 10 && dx > Math.abs(dy)) {
        GestureStateManager.fail(event.handlerTag);
      } else if (dy > 8 && dy > dx) {
        GestureStateManager.activate(event.handlerTag);
      }
    },
    onTouchesUp: event => {
      if (!dragging.value) GestureStateManager.fail(event.handlerTag);
    },
    onActivate: () => {
      if (busy.value || scrollY.value > 1) return;
      cancelAnimation(pull);
      dragging.value = true;
      ready.value = false;
      scheduleOnRN(beginPull);
    },
    onUpdate: event => {
      if (!dragging.value || busy.value) return;
      pull.value = Math.min(MAX_PULL, Math.max(0, event.translationY * 0.5));
      const isReady = pull.value >= REFRESH_DISTANCE;
      if (ready.value !== isReady) {
        ready.value = isReady;
        scheduleOnRN(markReady, isReady);
      }
    },
    onDeactivate: event => {
      if (!dragging.value) return;
      dragging.value = false;
      if (!event.canceled && pull.value >= REFRESH_DISTANCE && !busy.value) {
        busy.value = true;
        pull.value = withTiming(LOADING_HEIGHT, {duration});
        scheduleOnRN(refresh);
      } else {
        scheduleOnRN(dismiss);
      }
    },
  });
  // Normal scrolling wins as soon as the pull recognizer rejects the direction or scroll position.
  const nativeGesture = useNativeGesture({requireToFail: gesture});
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = Math.max(0, event.nativeEvent.contentOffset.y);
    onScroll?.(event);
  }, [onScroll, scrollY]);
  const contentStyle = useAnimatedStyle(() => ({transform: [{translateY: pull.value}]}));
  const indicatorStyle = useAnimatedStyle(() => ({height: pull.value, opacity: Math.min(1, pull.value / REFRESH_DISTANCE)}));

  return <GestureDetector gesture={gesture}>
    <View style={styles.viewport}>
      <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]}>
        {phase !== 'idle' ? <HomeRefreshIndicator phase={phase} pullDistance={pull} motionEnabled={motionEnabled} /> : null}
      </Animated.View>
      <Animated.View testID="home-refresh-content" style={[styles.content, contentStyle]}>
        <GestureDetector gesture={nativeGesture}>
          <ScrollView {...props} ref={ref} testID={props.testID ?? 'home-refresh-scroll'} style={style}
            bounces={false} overScrollMode="never" scrollEventThrottle={16} onScroll={handleScroll}>
            {children}
          </ScrollView>
        </GestureDetector>
      </Animated.View>
    </View>
  </GestureDetector>;
}

const styles = StyleSheet.create({
  viewport: {flex: 1, minHeight: 0, overflow: 'hidden'},
  content: {flex: 1},
  indicator: {position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden'},
});
