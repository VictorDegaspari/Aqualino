import React, {useEffect, useRef, useState} from 'react';
import {AppState, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useReducedMotion} from 'react-native-reanimated';
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
  const shouldPlay = lit && focused && appState === 'active' && !reducedMotion && !failed;

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
