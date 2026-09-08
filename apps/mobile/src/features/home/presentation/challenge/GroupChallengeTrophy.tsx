import type {HydrationChallenge} from '@aqualino/contracts';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ChallengeAsset} from './ChallengeAsset';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {challengeTheme} from './challengeTheme';

const medals = {gold: 'rankGold', silver: 'rankSilver', bronze: 'rankBronze'} as const;
const labels = {gold: 'Ouro', silver: 'Prata', bronze: 'Bronze'};

export function GroupChallengeTrophy({challenge}: {challenge: HydrationChallenge}): React.JSX.Element {
  const own = challenge.leaderboard?.find(entry => entry.is_you);
  const label = own?.medal ? `${labels[own.medal]} ${challenge.status === 'completed' ? 'confirmado' : 'projetado'}${own.tied ? ' · empate' : ''}`
    : own && own.points > 0 ? 'Medalha de conclusão' : 'Pontue para conquistar sua medalha';
  return <View accessible accessibilityLabel={label} style={styles.container}>
    {own?.medal ? <ChallengeAsset name={medals[own.medal]} style={styles.medal} /> : <AqualinoIcon name="star" size={42} color={challengeTheme.colors.muted} />}
    <Text style={styles.label}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 16, gap: 4},
  medal: {width: 75, height: 82},
  label: {color: challengeTheme.colors.cyanStrong, fontWeight: '800', fontSize: 14},
});
