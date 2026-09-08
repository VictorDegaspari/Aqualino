import type {GroupLeaderboardEntry} from '@aqualino/contracts';
import React, {memo} from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {UserAvatar} from '../../../../shared/avatars/UserAvatar';
import {ChallengeAsset} from './ChallengeAsset';
import {challengeTheme} from './challengeTheme';
import type {AppLocale} from '../../../../shared/i18n/appLocale';

const medals = {gold: 'rankGold', silver: 'rankSilver', bronze: 'rankBronze'} as const;

export const LeaderboardPlayer = memo(function LeaderboardPlayerView({entry, locale = 'pt-BR'}: {entry: GroupLeaderboardEntry; locale?: AppLocale}): React.JSX.Element {
  const english = locale === 'en-US';
  const progressStyle: ViewStyle = {width: `${Math.min(100, Math.max(0, entry.percentage))}%`};
  const rank = entry.rank === null ? (locale === 'es-ES' ? "Sin posición" : english ? 'Unranked' : 'Sem posição') : english ? `rank ${entry.rank}${entry.tied ? ', tied' : ''}` : `${entry.rank}º${entry.tied ? ' empatado' : ' lugar'}`;

  return (
    <View accessible accessibilityLabel={`${entry.display_name}${entry.is_you ? (locale === 'es-ES' ? ", tú" : english ? ', you' : ', você') : ''}, ${rank}, ${formatPoints(entry.points, locale)} ${locale === 'es-ES' ? "puntos" : english ? 'points' : 'pontos'}`} style={styles.player}>
      <View style={styles.rank}>
        {entry.medal ? <ChallengeAsset name={medals[entry.medal]} style={styles.medal} /> : null}
        <Text style={styles.position}>{entry.rank === null ? '—' : `${english ? '#' : ''}${entry.rank}${english ? '' : 'º'}${entry.tied ? ' =' : ''}`}</Text>
      </View>
      <View style={[styles.avatarRing, entry.is_you && styles.activeRing]}>
        <UserAvatar avatarId={entry.avatar_url} style={styles.avatar} />
      </View>
      <Text numberOfLines={1} style={styles.name}>{entry.is_you ? (locale === 'es-ES' ? "Tú" : english ? 'You' : 'Você') : entry.display_name}</Text>
      <Text style={styles.points}>{formatPoints(entry.points, locale)}</Text>
      <View style={styles.track}><View style={[styles.progress, progressStyle]} /></View>
    </View>
  );
});

export function formatPoints(value: number, locale: AppLocale = 'pt-BR'): string {
  return value.toLocaleString(locale, {maximumFractionDigits: 2});
}

const styles = StyleSheet.create({
  player: {flex: 1, minWidth: 0, alignItems: 'center', gap: 2},
  rank: {height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  medal: {width: 25, height: 28},
  position: {fontSize: 12, lineHeight: 17, fontWeight: '900', color: challengeTheme.colors.text},
  avatarRing: {width: 34, height: 34, borderRadius: 17, overflow: 'hidden', borderWidth: 2, borderColor: '#416782', backgroundColor: '#113652'},
  activeRing: {borderColor: challengeTheme.colors.cyanStrong},
  avatar: {width: '100%', height: '100%'},
  name: {maxWidth: '95%', color: challengeTheme.colors.text, fontSize: 11},
  points: {color: challengeTheme.colors.cyanStrong, fontSize: 12, fontWeight: '800'},
  track: {width: '78%', height: 4, borderRadius: 4, overflow: 'hidden', backgroundColor: '#103754'},
  progress: {height: '100%', borderRadius: 4, backgroundColor: challengeTheme.colors.cyan},
});
