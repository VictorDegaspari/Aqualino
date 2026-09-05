import type {MascotCondition} from '@aqualino/contracts';
import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon, type AqualinoIconName} from '../../../../shared/components/AqualinoIcon';
import {AqualinoMascot} from '../AqualinoMascot';
import {challengeTheme} from './challengeTheme';
import {HydrationFlame} from '../../../hydration/presentation/HydrationFlame';
import {LevelBadge} from '../../../../shared/components/LevelBadge';

interface Props {
  condition: MascotCondition;
  streak: number;
  waterMl: number;
  xp: number;
  level?: number;
  onOpenInventory: () => void;
}

export const ChallengeHeader = memo(function ChallengeHeaderView({condition, streak, waterMl, xp, level = 1, onOpenInventory}: Props): React.JSX.Element {
  return (
    <>
      <View style={styles.topRow}>
        <View style={styles.mascot}>
          <AqualinoMascot condition={condition} compact />
          <LevelBadge level={level} />
        </View>
        <View style={styles.statsPanel}>
          <View style={styles.stat}>
            <HydrationFlame totalMl={waterMl} size={22} />
            <Text numberOfLines={1} style={styles.statLabel}>{streak} dias</Text>
          </View>
          <View style={styles.divider} />
          <Stat icon="water" label={`${formatNumber(waterMl)} ml`} />
          <View style={styles.divider} />
          <Pressable
            testID="home-inventory"
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
  mascot: {alignItems: 'center', gap: 4},
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
