import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {challengeTheme} from './challenge/challengeTheme';

export function HomeLoading({motionEnabled}: {motionEnabled: boolean}): React.JSX.Element {
  return <SafeAreaView style={styles.page}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Carregando hidratação" accessibilityState={{busy: true}} style={styles.content}>
      <LoadingWaterDrop size={148} motionEnabled={motionEnabled} />
      <Text style={styles.label}>Carregando sua hidratação…</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: challengeTheme.colors.background},
  content: {alignItems: 'center', gap: 22},
  label: {fontSize: 14, lineHeight: 20, fontWeight: '600', color: challengeTheme.colors.muted, textAlign: 'center'},
});
