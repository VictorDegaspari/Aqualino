import {useTranslation} from '../../../../shared/i18n/useTranslation';
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
  const {locale, t} = useTranslation();
  return (
    <>
      <View style={styles.topRow}>
        <View style={styles.mascot}>
          <AqualinoMascot condition={condition} compact />
          <LevelBadge locale={locale} level={level} />
        </View>
        <View style={styles.controls}>
          <View style={styles.statsPanel}>
            <View style={styles.stat}>
              <HydrationFlame totalMl={waterMl} size={22} />
              <Text numberOfLines={1} style={styles.statLabel}>{t(`${streak} dias`, `${streak} days`, `${streak} días`)}</Text>
            </View>
            <View style={styles.divider} />
            <Stat icon="water" label={`${waterMl.toLocaleString(locale)} ml`} />
            <View style={styles.divider} />
            <Pressable
              testID="home-inventory"
              accessibilityRole="button"
              accessibilityLabel={t(`Abrir inventário, ${xp} XP`, `Open inventory, ${xp} XP`, `Abrir inventario, ${xp} XP`)}
              onPress={onOpenInventory}
              style={({pressed}) => [styles.stat, pressed && styles.pressed]}>
              <AqualinoIcon name="star" size={22} />
              <Text numberOfLines={1} style={styles.statLabel}>{xp.toLocaleString(locale)} XP</Text>
            </Pressable>
          </View>
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


const styles = StyleSheet.create({
  mascot: {alignItems: 'center', gap: 4},
  topRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  controls: {flex: 1, gap: 4},
  statsPanel: {
    height: 54, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    borderRadius: 20, borderWidth: 2, borderColor: '#0A355C', backgroundColor: 'rgba(0, 12, 34, 0.86)',
  },
  stat: {flex: 1, minWidth: 0, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 1},
  statLabel: {fontSize: 11, lineHeight: 14, fontWeight: '900', color: challengeTheme.colors.text},
  divider: {width: 1, height: 31, backgroundColor: '#103A60'},
  pressed: {opacity: 0.7},
});
