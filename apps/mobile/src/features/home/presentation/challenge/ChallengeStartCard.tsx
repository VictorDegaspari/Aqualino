import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {HydrationChallenge, HydrationToday} from '@aqualino/contracts';
import {GroupButton} from '../../../groups/presentation/GroupButton';
import {CurrentWaterDrop} from './CurrentWaterDrop';
import {RewardChestIcon} from './RewardChestIcon';
import {challengeTheme} from './challengeTheme';

export function ChallengeStartCard({mode, challenge, today, canStart, starting, error, motionEnabled, onStart, onReward}: {
  mode: 'solo' | 'group'; challenge?: HydrationChallenge | null; today?: HydrationToday;
  canStart: boolean; starting?: boolean; error?: string; motionEnabled: boolean;
  onStart: () => void; onReward: () => void;
}): React.JSX.Element {
  const scheduled = challenge?.status === 'scheduled';
  const completed = challenge?.status === 'completed';
  const rewardWaiting = mode === 'solo' && completed && challenge.reward?.state === 'available';
  return <View style={styles.card}>
    {mode === 'solo' ? <CurrentWaterDrop scale={0.9} totalMl={today?.total_ml ?? 0} goalMl={today?.goal_ml ?? 2000} motionEnabled={motionEnabled} /> : null}
    <Text style={styles.title}>{scheduled ? 'Desafio agendado!' : completed ? 'Desafio encerrado' : '7 dias para cuidar de você'}</Text>
    <Text style={styles.description}>{scheduled
      ? `Começa em ${challenge.progress.starts_on.split('-').reverse().join('/')} à meia-noite, no fuso ${challenge.progress.timezone}. As marcações de hoje ficam fora deste desafio.`
      : mode === 'solo' ? 'Comece hoje e cumpra as 7 metas diárias para abrir um baú com XP ou uma poção surpresa.'
        : 'O desafio do grupo começa amanhã e dura 7 dias. O responsável pelo grupo dá a largada.'}</Text>
    {mode === 'solo' && completed ? <Pressable accessibilityRole="button" accessibilityLabel="Ver baú do desafio solo" onPress={onReward} style={styles.reward}>
      <RewardChestIcon size={64} opened={challenge.reward?.state === 'claimed'} />
      <Text style={styles.rewardText}>{challenge.reward?.state === 'available' ? 'Seu baú está liberado!' : `${challenge.progress.completed_goal_days} de 7 metas cumpridas`}</Text>
    </Pressable> : null}
    {!scheduled && canStart && !rewardWaiting ? <View style={styles.button}><GroupButton label={starting ? 'Iniciando…' : mode === 'solo' ? 'Iniciar desafio de 7 dias' : 'Iniciar desafio do grupo'} busy={starting} onPress={onStart} /></View> : null}
    {rewardWaiting ? <Text style={styles.description}>Abra seu baú antes de iniciar outro desafio.</Text> : null}
    {!canStart && !scheduled && mode === 'group' ? <Text style={styles.description}>Aguardando o responsável iniciar o desafio.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 12},
  title: {fontSize: 23, lineHeight: 30, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  description: {maxWidth: 340, fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted, textAlign: 'center'},
  button: {width: '100%', maxWidth: 340, marginTop: 6},
  error: {fontSize: 13, lineHeight: 18, color: challengeTheme.colors.danger, textAlign: 'center'},
  reward: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rewardText: {fontSize: 13, color: challengeTheme.colors.cyanStrong, fontWeight: '700'},
});
