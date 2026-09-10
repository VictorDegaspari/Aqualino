import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {challengeTheme} from './challenge/challengeTheme';
import {LoadingMascot} from './LoadingMascot';

export function HomeLoading(): React.JSX.Element {
  const {t} = useTranslation();
  return <SafeAreaView style={styles.page}>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('Carregando hidratação', 'Loading hydration', 'Cargando hidratación')} accessibilityState={{busy: true}} style={styles.content}>
      <LoadingMascot style={styles.mascot} />
      <Text style={styles.label}>{t('Carregando sua hidratação…', 'Loading your hydration…', 'Cargando tu hidratación…')}</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: challengeTheme.colors.background},
  content: {alignItems: 'center', gap: 16},
  mascot: {width: 220, height: 220},
  label: {fontSize: 14, lineHeight: 20, fontWeight: '600', color: challengeTheme.colors.muted, textAlign: 'center'},
});
