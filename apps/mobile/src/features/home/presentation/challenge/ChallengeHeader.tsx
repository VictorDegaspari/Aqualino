import type {MascotCondition} from '@aqualino/contracts';
import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon, type AqualinoIconName} from '../../../../shared/components/AqualinoIcon';
import {AqualinoMascot} from '../AqualinoMascot';
import {challengeTheme} from './challengeTheme';

interface Props {
  condition: MascotCondition;
  streak: number;
  waterMl: number;
  xp: number;
  onOpenInventory: () => void;
}

export const ChallengeHeader = memo(function ChallengeHeaderView({condition, streak, waterMl, xp, onOpenInventory}: Props): React.JSX.Element {
  return (
    <>
      <View style={styles.topRow}>
        <AqualinoMascot condition={condition} compact />
        <View style={styles.statsPanel}>
          <Stat icon="flame" label={`${streak} dias`} />
          <View style={styles.divider} />
          <Stat icon="water" label={`${formatNumber(waterMl)} ml`} />
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir inventário, ${xp} XP`}
            onPress={onOpenInventory}
            style={({pressed}) => [styles.stat, pressed && styles.pressed]}>
            <AqualinoIcon name="star" size={22} />
            <Text numberOfLines={1} style={styles.statLabel}>{formatNumber(xp)} XP</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
});

function Stat({icon, label}: {icon: AqualinoIconName; label: string}) {
  return (
    <View style={styles.stat}>
      <AqualinoIcon name={icon} size={22} />
      <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

const styles = StyleSheet.create({
  topRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  statsPanel: {
    flex: 1, height: 54, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    borderRadius: 20, borderWidth: 2, borderColor: '#0A355C', backgroundColor: 'rgba(0, 12, 34, 0.86)',
  },
  stat: {flex: 1, minWidth: 0, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 1},
  statLabel: {fontSize: 11, lineHeight: 14, fontWeight: '900', color: challengeTheme.colors.text},
  divider: {width: 1, height: 31, backgroundColor: '#103A60'},
  pressed: {opacity: 0.7},
});
