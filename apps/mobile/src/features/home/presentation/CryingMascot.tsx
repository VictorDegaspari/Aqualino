import React, {useEffect, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {AppState, Image, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useReducedMotion} from 'react-native-reanimated';
import Rive, {Direction, Fit, LoopMode, type RiveRef} from 'rive-react-native';
import {mascotImages} from '../../../assets/mascot/mascotImages';

const CRYING = require('../../../assets/mascot/rive/aqualino_chorando.riv');
const ARTBOARD = 'Aqualino Chorando - Rosto';
const STATE_MACHINE = 'Aqualino - Choro';

interface Props {
  style: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function CryingMascot({style, accessibilityLabel}: Props): React.JSX.Element {
  const rive = useRef<RiveRef>(null);
  const isFocused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const [appState, setAppState] = useState(AppState.currentState);
  const [failed, setFailed] = useState(false);
  const shouldPlay = isFocused && appState === 'active' && !reducedMotion;

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
      testID="crying-mascot"
      pointerEvents="none"
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={style}>
      {failed ? (
        <Image testID="crying-mascot-fallback" source={mascotImages.angry} resizeMode="contain" style={styles.content} />
      ) : (
        <Rive
          ref={rive}
          testID="crying-mascot-animation"
          source={CRYING}
          artboardName={ARTBOARD}
          stateMachineName={STATE_MACHINE}
          fit={Fit.Contain}
          autoplay={shouldPlay}
          onError={() => setFailed(true)}
          style={styles.content}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {width: '100%', height: '100%'},
});
