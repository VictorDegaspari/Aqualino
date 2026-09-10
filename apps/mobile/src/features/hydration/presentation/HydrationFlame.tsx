import React, {useEffect, useId, useRef, useState} from 'react';
import {AppState, StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import Svg, {Circle, Defs, RadialGradient, Stop} from 'react-native-svg';
import Rive, {Direction, Fit, LoopMode, type RiveRef} from 'rive-react-native';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';

const FIRE = require('../../../assets/mascot/rive/streak_fire.riv');
const STATE_MACHINE = 'Streak - Queimando';

interface Props {
  totalMl: number;
  size: number;
}

export function HydrationFlame({totalMl, size}: Props): React.JSX.Element {
  const lit = totalMl > 0;
  const rive = useRef<RiveRef>(null);
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const [appState, setAppState] = useState(AppState.currentState);
  const [failed, setFailed] = useState(false);
  const glowId = useId();
  const glowPulse = useSharedValue(0);
  const animateGlow = lit && focused && appState === 'active' && !reducedMotion;
  const shouldPlay = lit && focused && appState === 'active' && !reducedMotion && !failed;

  useEffect(() => {
    glowPulse.value = 0;
    if (animateGlow) {
      glowPulse.value = withRepeat(withTiming(1, {duration: 1800, easing: Easing.inOut(Easing.ease)}), -1, true);
    }
    return () => cancelAnimation(glowPulse);
  }, [animateGlow, glowPulse]);

  const glowStyle = useAnimatedStyle(() => ({opacity: 0.55 + glowPulse.value * 0.2}));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (shouldPlay) {
      rive.current?.play(STATE_MACHINE, LoopMode.Auto, Direction.Auto, true);
    } else {
      rive.current?.pause();
    }
  }, [shouldPlay]);

  return (
    <View
      pointerEvents="none"
      style={{width: size, height: size}}
      accessible
      accessibilityRole="image"
      accessibilityLabel={lit ? 'Fogo aceso: você já bebeu água hoje' : 'Fogo apagado: você ainda não bebeu água hoje'}>
      {lit ? (
        <Animated.View
          pointerEvents="none"
          accessible={false}
          style={[styles.glow, {width: size * 2, height: size * 2, left: -size / 2, top: -size / 2}, glowStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" accessible={false}>
            <Defs>
              <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFBE55" stopOpacity={0.65} />
                <Stop offset="35%" stopColor="#FF983D" stopOpacity={0.35} />
                <Stop offset="70%" stopColor="#FF762C" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#FF762C" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill={`url(#${glowId})`} />
          </Svg>
        </Animated.View>
      ) : null}
      {lit && !failed ? (
        <Rive
          ref={rive}
          testID="streak-fire-animation"
          source={FIRE}
          artboardName="Streak - Fogo"
          stateMachineName={STATE_MACHINE}
          fit={Fit.Contain}
          autoplay={shouldPlay}
          onError={() => setFailed(true)}
          style={{width: size, height: size}}
        />
      ) : (
        <AqualinoIcon name="flame" size={size} color={lit ? undefined : '#607485'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({glow: {position: 'absolute'}});
