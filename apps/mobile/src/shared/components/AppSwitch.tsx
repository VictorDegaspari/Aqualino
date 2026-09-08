import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import Animated, {cancelAnimation, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

export function AppSwitch({value, onValueChange, disabled = false, accessibilityLabel, testID}: Props): React.JSX.Element {
  const [checked, setChecked] = useState(value);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const confirmed = useRef(value);
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    confirmed.current = value;
    if (!pending.current) setChecked(value);
  }, [value]);
  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {duration: reducedMotion ? 0 : 180});
  }, [checked, progress, reducedMotion]);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; cancelAnimation(progress);};
  }, [progress]);

  const toggle = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    setSaving(true);
    setChecked(!checked);
    try {
      const accepted = await onValueChange(!checked);
      if (accepted === false && mounted.current) setChecked(confirmed.current);
    } catch {
      // The caller reports the save error; the switch restores the confirmed value.
      if (mounted.current) setChecked(confirmed.current);
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#29465F', '#91C8D1']),
  }));
  const thumbStyle = useAnimatedStyle(() => ({transform: [{translateX: progress.value * 20}]}));

  return <Pressable testID={testID} accessibilityRole="switch" accessibilityLabel={accessibilityLabel}
    accessibilityState={{checked, disabled: disabled || saving, busy: saving}}
    disabled={disabled || saving} onPress={() => {toggle();}} style={styles.touchTarget}>
    <Animated.View style={[styles.track, trackStyle]}>
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </Animated.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  touchTarget: {width: 52, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  track: {width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 3},
  thumb: {width: 22, height: 22, borderRadius: 11, backgroundColor: '#ECFAFF'},
});
