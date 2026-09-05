import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import type {AppLocale} from '../i18n/appLocale';

export function levelColor(level: number): string {
  if (level >= 100) return '#F5C85B';
  if (level >= 50) return '#B597FF';
  if (level >= 10) return '#66BFFF';
  if (level >= 5) return '#6AD9AD';
  return '#90B9CC';
}

export function LevelBadge({level, locale = 'pt-BR'}: {level: number; locale?: AppLocale}): React.JSX.Element {
  const label = `${locale === 'en-US' ? 'Level' : 'Nível'} ${level}`;
  return <View accessible accessibilityLabel={label} style={[styles.badge, {borderColor: levelColor(level)}]}>
    <Text numberOfLines={1} style={[styles.label, {color: levelColor(level)}]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  badge: {alignSelf: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: challengeTheme.colors.backgroundDeep},
  label: {fontSize: 10, lineHeight: 13, fontWeight: '800'},
});
