import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {LevelProgress} from '@aqualino/contracts';
import {levelColor} from '../../../shared/components/LevelBadge';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export function LevelProgressCard({level, progress, multiplier = 1}: {level: number; progress: LevelProgress; multiplier?: number}): React.JSX.Element {
  const color = levelColor(level);
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>Próximo nível: {level + 1}</Text>
      <Text style={[styles.xp, {color}]}>{progress.current_xp.toLocaleString('pt-BR')} / {progress.required_xp.toLocaleString('pt-BR')} XP</Text>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Progresso de nível" accessibilityValue={{min: 0, max: progress.required_xp, now: progress.current_xp}} style={styles.track}>
      <View style={[styles.fill, {width: `${progress.percentage}%`, backgroundColor: color}]} />
    </View>
    <Text style={styles.hint}>Seu nível é permanente. Faltam {progress.remaining_xp.toLocaleString('pt-BR')} XP para subir.</Text>
    <Text style={styles.hint}>Sequência: {multiplier.toLocaleString('pt-BR')}× XP · +10% por dia seguido, até 2×.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: {alignSelf: 'stretch', marginTop: 18, gap: 9},
  row: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4},
  title: {fontSize: 12, fontWeight: '700', color: challengeTheme.colors.text},
  xp: {fontSize: 12, fontWeight: '800'},
  track: {height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: challengeTheme.colors.border},
  fill: {height: '100%', borderRadius: 3},
  hint: {fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted},
});
