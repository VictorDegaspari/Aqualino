import type {MascotCondition} from '@aqualino/contracts';
import React from 'react';
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
  onSignOut: () => void;
}

export function ChallengeHeader({condition, streak, waterMl, xp, onOpenInventory, onSignOut}: Props): React.JSX.Element {
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
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>Desafio atual</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={onSignOut}
          style={({pressed}) => [styles.exit, pressed && styles.pressed]}>
          <AqualinoIcon name="logout" size={17} color={challengeTheme.colors.muted} />
        </Pressable>
      </View>
    </>
  );
}

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
  titleRow: {height: 45, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {
    color: challengeTheme.colors.text, fontSize: 29, lineHeight: 36, fontWeight: '900', letterSpacing: 0.2,
    textShadowColor: '#466B91', textShadowRadius: 7,
  },
  exit: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderRadius: 17, borderWidth: 1, borderColor: challengeTheme.colors.border,
    backgroundColor: 'rgba(0, 18, 42, 0.78)',
  },
  pressed: {opacity: 0.7},
});
