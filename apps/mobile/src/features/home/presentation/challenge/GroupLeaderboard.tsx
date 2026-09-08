import type {HydrationChallenge} from '@aqualino/contracts';
import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {LeaderboardPlayer} from './LeaderboardPlayer';
import {challengeTheme} from './challengeTheme';
import type {AppLocale} from '../../../../shared/i18n/appLocale';

export const GroupLeaderboard = memo(function GroupLeaderboardView({challenge, onDetails, locale = 'pt-BR'}: {
  challenge: HydrationChallenge; onDetails: () => void; locale?: AppLocale;
}): React.JSX.Element {
  const english = locale === 'en-US';
  return (
    <View style={styles.panel}>
      <Pressable accessibilityRole="button" accessibilityLabel={locale === 'es-ES' ? "Ver la clasificación completa del grupo" : english ? 'View full group standings' : 'Ver placar completo do grupo'} onPress={onDetails} style={styles.heading}>
        <Text style={styles.title}>{locale === 'es-ES' ? "Clasificación del grupo" : english ? 'Group standings' : 'Placar do grupo'}</Text>
        <Text style={styles.status}>{challenge.status === 'completed' ? (locale === 'es-ES' ? "Definitivo" : english ? 'Final' : 'Definitivo') : challenge.status === 'settling' ? (locale === 'es-ES' ? "Calculando" : english ? 'Finalizing' : 'Apurando') : (locale === 'es-ES' ? "Proyección" : english ? 'Projected' : 'Projeção')} ›</Text>
      </Pressable>
      <View style={styles.players}>
        {challenge.leaderboard?.map(entry => <LeaderboardPlayer locale={locale} key={entry.user_id} entry={entry} />)}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {paddingHorizontal: 10, paddingBottom: 8, borderRadius: challengeTheme.radius.panel, borderWidth: 1,
    borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel},
  heading: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  title: {fontSize: 15, fontWeight: '900', color: challengeTheme.colors.text},
  status: {fontSize: 11, color: challengeTheme.colors.cyan},
  players: {flexDirection: 'row', alignItems: 'flex-end'},
});
