import {useTranslation} from '../../../shared/i18n/useTranslation';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {LevelProgress} from '@aqualino/contracts';
import {levelColor} from '../../../shared/components/LevelBadge';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export function LevelProgressCard({level, progress, multiplier = 1}: {level: number; progress: LevelProgress; multiplier?: number}): React.JSX.Element {
  const {locale, t} = useTranslation();
  const color = levelColor(level);
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.title}>{t(`Próximo nível: ${level + 1}`, `Next level: ${level + 1}`, `Próximo nivel: ${level + 1}`)}</Text>
      <Text style={[styles.xp, {color}]}>{progress.current_xp.toLocaleString(locale)} / {progress.required_xp.toLocaleString(locale)} XP</Text>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t("Progresso de nível", "Level progress", "Progreso de nivel")} accessibilityValue={{min: 0, max: progress.required_xp, now: progress.current_xp}} style={styles.track}>
      <View style={[styles.fill, {width: `${progress.percentage}%`, backgroundColor: color}]} />
    </View>
    <Text style={styles.hint}>{t(`Seu nível é permanente. Faltam ${progress.remaining_xp.toLocaleString(locale)} XP para subir.`, `Your level is permanent. ${progress.remaining_xp.toLocaleString(locale)} XP to level up.`, `Tu nivel es permanente. Faltan ${progress.remaining_xp.toLocaleString(locale)} XP para subir.`)}</Text>
    <Text style={styles.hint}>{t(`Sequência: ${multiplier.toLocaleString(locale)}× XP · +10% por dia seguido, até 2×.`, `Streak: ${multiplier.toLocaleString(locale)}× XP · +10% per consecutive day, up to 2×.`, `Racha: ${multiplier.toLocaleString(locale)}× XP · +10% por día consecutivo, hasta 2×.`)}</Text>
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
