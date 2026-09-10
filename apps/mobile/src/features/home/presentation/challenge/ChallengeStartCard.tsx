import {useTranslation} from '../../../../shared/i18n/useTranslation';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {HydrationChallenge, HydrationToday} from '@aqualino/contracts';
import {GroupButton} from '../../../groups/presentation/GroupButton';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {CurrentWaterDrop} from './CurrentWaterDrop';
import {RewardChestIcon} from './RewardChestIcon';
import {challengeTheme} from './challengeTheme';

export function ChallengeStartCard({mode, challenge, today, canStart, starting, error, motionEnabled, onStart, onReward}: {
  mode: 'solo' | 'group'; challenge?: HydrationChallenge | null; today?: HydrationToday;
  canStart: boolean; starting?: boolean; error?: string; motionEnabled: boolean;
  onStart: () => void; onReward: () => void;
}): React.JSX.Element {
  const {t} = useTranslation();
  const scheduled = challenge?.status === 'scheduled';
  const completed = challenge?.status === 'completed';
  const settling = challenge?.status === 'settling';
  const cancelled = challenge?.status === 'cancelled';
  const waitingForNext = mode === 'group' && challenge?.status === 'active' && challenge.participating === false;
  const reviewing = challenge?.reward?.state === 'reviewing';
  const rewardWaiting = mode === 'solo' && completed && (challenge.reward?.state === 'available' || reviewing);
  return <View style={styles.card}>
    {mode === 'solo' ? <CurrentWaterDrop scale={0.9} totalMl={today?.total_ml ?? 0} goalMl={today?.goal_ml ?? 2000} motionEnabled={motionEnabled} /> : null}
    {mode === 'group' ? <View style={styles.groupIcon}><AqualinoIcon name="group" size={32} color={challengeTheme.colors.cyanStrong} /></View> : null}
    <Text style={styles.title}>{scheduled ? t("Desafio agendado!", "Challenge scheduled!", "¡Desafío programado!") : settling ? t("Apurando o resultado", "Finalizing results", "Calculando el resultado") : cancelled ? t("Aguardando a equipe", "Waiting for the team", "Esperando al equipo") : waitingForNext ? t("Você entra na próxima rodada", "You join the next round", "Participarás en la próxima ronda") : completed ? t("Desafio encerrado", "Challenge ended", "Desafío terminado") : mode === 'group' ? canStart ? t("7 dias em equipe", "7 days as a team", "7 días en equipo") : t("Aguardando a equipe", "Waiting for the team", "Esperando al equipo") : t("7 dias para cuidar de você", "7 days to care for yourself", "7 días para cuidarte")}</Text>
    <Text style={styles.description}>{scheduled
      ? t(`Começa em ${challenge.progress.starts_on.split('-').reverse().join('/')} à meia-noite, no fuso ${challenge.progress.timezone}. As marcações de hoje ficam fora deste desafio.`, `Starts on ${challenge.progress.starts_on} at midnight (${challenge.progress.timezone}). Today's logs are not part of this challenge.`, `Empieza el ${challenge.progress.starts_on.split('-').reverse().join('/')} a medianoche (${challenge.progress.timezone}). Los registros de hoy quedan fuera de este desafío.`)
      : settling ? t("O período terminou. Estamos aguardando as últimas sincronizações e votações antes de confirmar as medalhas e os prêmios.", "The round has ended. We are waiting for the last syncs and votes before confirming medals and rewards.", "La ronda ha terminado. Esperamos las últimas sincronizaciones y votaciones antes de confirmar las medallas y los premios.")
      : waitingForNext ? t("Esta disputa começou antes da sua entrada. Você já pode acompanhar o placar e participa do próximo desafio.", "This round started before you joined. Follow the standings and take part in the next challenge.", "Esta ronda empezó antes de que te unieras. Puedes seguir la clasificación y participar en el próximo desafío.")
      : mode === 'solo' ? t("Comece hoje e cumpra as 7 metas diárias para abrir um baú com XP ou uma poção surpresa.", "Start today and reach all 7 daily goals to open a chest with XP or a surprise potion.", "Empieza hoy y cumple las 7 metas diarias para abrir un cofre con XP o una poción sorpresa.")
        : canStart ? t("A rodada começa amanhã e dura 7 dias.", "The round starts tomorrow and lasts 7 days.", "La ronda empieza mañana y dura 7 días.") : t("Com pelo menos 2 integrantes, o responsável pode iniciar a rodada.", "With at least 2 members, the leader can start the round.", "Con al menos 2 miembros, el responsable puede iniciar la ronda.")}</Text>
    {mode === 'solo' && completed ? <Pressable accessibilityRole="button" accessibilityLabel={t("Ver baú do desafio solo", "View solo challenge chest", "Ver cofre del desafío individual")} onPress={onReward} style={styles.reward}>
      <RewardChestIcon size={64} opened={challenge.reward?.state === 'claimed'} />
      <Text style={styles.rewardText}>{reviewing ? t("Aguardando as votações", "Waiting for votes", "Esperando las votaciones") : challenge.reward?.state === 'available' ? t("Seu baú está liberado!", "Your chest is ready!", "¡Tu cofre está disponible!") : t(`${challenge.progress.completed_goal_days} de 7 metas cumpridas`, `${challenge.progress.completed_goal_days} of 7 goals reached`, `${challenge.progress.completed_goal_days} de 7 metas cumplidas`)}</Text>
    </Pressable> : null}
    {!scheduled && (!settling || mode === 'group') && !waitingForNext && canStart && !rewardWaiting ? <View style={styles.button}><GroupButton label={starting ? t("Iniciando…", "Starting…", "Iniciando…") : mode === 'solo' ? t("Iniciar desafio de 7 dias", "Start 7-day challenge", "Iniciar desafío de 7 días") : completed || settling ? t("Iniciar próxima rodada", "Start next round", "Iniciar próxima ronda") : t("Iniciar desafio do grupo", "Start group challenge", "Iniciar desafío del grupo")} busy={starting} onPress={onStart} /></View> : null}
    {rewardWaiting ? <Text style={styles.description}>{reviewing ? t("O baú aguarda a revisão das marcações por até 12 horas após a sincronização.", "The chest awaits log reviews for up to 12 hours after syncing.", "El cofre espera la revisión de los registros hasta 12 horas después de la sincronización.") : t("Abra seu baú antes de iniciar outro desafio.", "Open your chest before starting another challenge.", "Abre tu cofre antes de iniciar otro desafío.")}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: {flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 12},
  groupIcon: {width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(145, 200, 209, 0.1)', borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, marginBottom: 4},
  title: {fontSize: 23, lineHeight: 30, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  description: {maxWidth: 340, fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted, textAlign: 'center'},
  button: {width: '100%', maxWidth: 340, marginTop: 6},
  error: {fontSize: 13, lineHeight: 18, color: challengeTheme.colors.danger, textAlign: 'center'},
  reward: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rewardText: {fontSize: 13, color: challengeTheme.colors.cyanStrong, fontWeight: '700'},
});
