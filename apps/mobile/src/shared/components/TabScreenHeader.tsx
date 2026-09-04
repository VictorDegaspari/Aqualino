import React, {type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';

interface Props {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

export function TabScreenHeader({title, subtitle, icon}: Props): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View pointerEvents="none" style={styles.icon}>{icon}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16},
  copy: {flex: 1, minWidth: 0},
  title: {fontSize: 28, lineHeight: 34, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {marginTop: 3, fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted},
  icon: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.54)', backgroundColor: 'rgba(11, 225, 236, 0.14)',
  },
});
