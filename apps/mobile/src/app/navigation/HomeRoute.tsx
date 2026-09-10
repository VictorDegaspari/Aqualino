import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {HomeLoading} from '../../features/home/presentation/HomeLoading';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';

export function HomeRoute(): React.JSX.Element {
  const focused = useIsFocused();
  const [laidOut, setLaidOut] = useState(false);
  const [Screen, setScreen] = useState<React.ComponentType | null>(null);
  const onLayout = useCallback(() => setLaidOut(true), []);

  useEffect(() => {
    if (!focused || !laidOut || Screen) return;
    let active = true;
    let idle: number | undefined;
    let nextFrame: number | undefined;
    // Paint the mascot before evaluating and mounting the heavier Home modules.
    const firstFrame = requestAnimationFrame(() => {
      if (!active) return;
      nextFrame = requestAnimationFrame(() => {
        if (!active) return;
        idle = requestIdleCallback(() => {
          if (!active) return;
          const HomeScreen = require('../../features/home/presentation/HomeScreen').HomeScreen;
          setScreen(() => HomeScreen);
        }, {timeout: 250});
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(firstFrame);
      if (nextFrame !== undefined) cancelAnimationFrame(nextFrame);
      if (idle !== undefined) cancelIdleCallback(idle);
    };
  }, [focused, laidOut, Screen]);

  return (
    <View testID="home-route" onLayout={onLayout} style={styles.page}>
      {Screen ? <Screen /> : <HomeLoading />}
    </View>
  );
}

const styles = StyleSheet.create({page: {flex: 1, backgroundColor: challengeTheme.colors.background}});
