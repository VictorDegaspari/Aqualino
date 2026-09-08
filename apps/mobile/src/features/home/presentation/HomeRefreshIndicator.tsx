import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {SharedValue} from 'react-native-reanimated';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {challengeTheme} from './challenge/challengeTheme';

export type HomeRefreshPhase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'error';

const labels: Record<HomeRefreshPhase, string> = {
  idle: 'Puxe para atualizar',
  pulling: 'Puxe para atualizar',
  ready: 'Solte para atualizar',
  refreshing: 'Atualizando hidratação',
  error: 'Não foi possível atualizar. Puxe para tentar novamente.',
};

export function HomeRefreshIndicator({phase, pullDistance, motionEnabled}: {
  phase: HomeRefreshPhase; pullDistance: SharedValue<number>; motionEnabled: boolean;
}): React.JSX.Element {
  return <View
    testID="home-refresh-indicator"
    accessible
    accessibilityRole={phase === 'refreshing' ? 'progressbar' : phase === 'error' ? 'alert' : 'text'}
    accessibilityLabel={labels[phase]}
    accessibilityState={{busy: phase === 'refreshing'}}
    accessibilityLiveRegion="polite"
    style={styles.indicator}>
    <LoadingWaterDrop size={64} fillValue={pullDistance} fillRange={64} animate={phase === 'refreshing'} motionEnabled={motionEnabled} />
    {phase === 'error' ? <Text style={styles.error}>Não foi possível atualizar</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  indicator: {height: 84, alignItems: 'center', justifyContent: 'center'},
  error: {fontSize: 11, lineHeight: 15, color: challengeTheme.colors.text, backgroundColor: challengeTheme.colors.backgroundDeep, paddingHorizontal: 8, borderRadius: 6},
});
