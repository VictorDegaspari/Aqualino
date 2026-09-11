import type {GroupChallengeRules, HydrationChallenge} from '@aqualino/contracts';
import {RaisedButton} from '../../../../shared/components/RaisedButton';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AppDialog} from '../../../../shared/components/AppDialog';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {GroupLeaderboard} from './GroupLeaderboard';
import {formatPoints} from './LeaderboardPlayer';
import {challengeTheme} from './challengeTheme';
import {haptics} from '../../../../shared/device/haptics';
import type {AppLocale} from '../../../../shared/i18n/appLocale';

export function GroupChallengePanel({challenge, result, rules, offline = false, locale = 'pt-BR'}: {
  challenge?: HydrationChallenge | null; result?: HydrationChallenge | null;
  rules?: GroupChallengeRules; offline?: boolean; locale?: AppLocale;
}): React.JSX.Element {
  const english = locale === 'en-US';
  const [dialog, setDialog] = useState<'rules' | 'current' | 'result'>();
  const selected = dialog === 'result' ? result : challenge;
  const currentRules = challenge?.rules ?? rules;
  const open = (next: typeof dialog) => {haptics.selection(); setDialog(next);};

  return <View style={styles.container}>
    {challenge?.leaderboard?.length && challenge.status !== 'cancelled'
      ? <GroupLeaderboard locale={locale} challenge={challenge} onDetails={() => open('current')} /> : null}
    <View style={styles.links}>
      {currentRules ? <RaisedButton
        style={styles.link}
        onPress={() => open('rules')}
        label={locale === 'es-ES' ? "Reglas y premios" : english ? 'Rules and rewards' : 'Regras e prêmios'}
        variant="outlined"
        tone="gold"
        size="compact"
        icon={<AqualinoIcon name="medalGold" size={20} />}
      /> : null}
      {result && result.id !== challenge?.id ? <RaisedButton
        style={styles.link}
        onPress={() => open('result')}
        label={result.status === 'settling' ? (locale === 'es-ES' ? "Calculando la ronda anterior" : english ? 'Finalizing previous round' : 'Apurando rodada anterior') : result.reward ? (locale === 'es-ES' ? "Tu premio de la ronda anterior" : english ? 'Your previous reward' : 'Seu prêmio da rodada anterior') : (locale === 'es-ES' ? "Resultado anterior" : english ? 'Previous results' : 'Resultado anterior')}
        variant="outlined"
        tone="gold"
        size="compact"
      /> : null}
    </View>
    {offline && challenge?.leaderboard?.length ? <Text style={styles.notice}>{locale === 'es-ES' ? "Última clasificación sincronizada. Envía los registros antes de medianoche en la zona del equipo para puntuar." : english ? 'Last synced standings. Sync before midnight in the group timezone to earn points.' : 'Último placar sincronizado. Envie as marcações antes da meia-noite da equipe para pontuar.'}</Text> : null}
    {dialog === 'rules' && currentRules ? <AppDialog title={locale === 'es-ES' ? "Reglas y premios" : english ? 'Rules and rewards' : 'Regras e prêmios'} icon="group" confirmLabel={locale === 'es-ES' ? "Entendido" : english ? 'Got it' : 'Entendi'} message={rulesMessage(currentRules, locale)} onClose={() => setDialog(undefined)} /> : null}
    {dialog && dialog !== 'rules' && selected ? <AppDialog title={selected.status === 'completed' ? (locale === 'es-ES' ? "Resultado del grupo" : english ? 'Group results' : 'Resultado do grupo') : (locale === 'es-ES' ? "Clasificación del grupo" : english ? 'Group standings' : 'Placar do grupo')}
      icon="star" confirmLabel={locale === 'es-ES' ? "Entendido" : english ? 'Got it' : 'Entendi'} message={standingsMessage(selected, locale)} onClose={() => setDialog(undefined)} /> : null}
  </View>;
}

function rulesMessage(rules: GroupChallengeRules, locale: AppLocale): string {
  if (locale === 'es-ES') {
    const rewards = rules.rewards.map(reward => `${reward.probability}%: ${reward.type === 'xp' ? `+${reward.amount} XP` : `${reward.amount} poción para ${reward.type === 'streak_freeze' ? 'congelar' : 'recuperar'} la racha`}`).join('\n');
    return `De 2 a 5 personas, durante 7 días en la zona horaria del grupo.\n\nLa referencia diaria de puntuación es ${rules.daily_goal_ml ?? 2000} ml para todos, sin depender de la meta personal. Cada día vale hasta ${rules.daily_points_cap} puntos y la ronda hasta ${rules.total_points_cap}. Beber por encima de la meta no da puntos extra.\n\nSe mantienen los empates: 1.º, 1.º, 3.º. Se comparan los puntos con ${rules.points_decimals} decimales. Los jugadores empatados comparten la misma medalla. Hay que sumar puntos para recibir una medalla o premio.\n\nCada primer puesto recibe un sorteo gratuito e independiente:\n${rewards}\n\nSincroniza dentro de las 24 horas del registro. Para puntuar en el grupo, debe llegar antes de medianoche en la zona horaria del equipo. Después, queda solo en el historial personal. El resultado y los premios son definitivos cuando se cierran todas las votaciones de fotos (hasta 12 horas después de cada envío).\n\nSolo se puede entrar al grupo antes del inicio de la primera ronda. El responsable inicia la próxima ronda manualmente para la siguiente medianoche. En la configuración del grupo puede activar el reinicio automático después del séptimo día. Se necesitan al menos 2 miembros. El XP personal, el plan Pro y las pociones no cambian la clasificación.`;
  }
  if (locale === 'en-US') {
    const rewards = rules.rewards.map(reward => `${reward.probability}%: ${reward.type === 'xp' ? `+${reward.amount} XP` : `${reward.amount} ${reward.type === 'streak_freeze' ? 'streak freeze' : 'streak revival'} potion`}`).join('\n');
    return `2–5 people, for 7 days in the group timezone.\n\nThe daily scoring reference is ${rules.daily_goal_ml ?? 2000} ml for everyone, regardless of personal goals. Each day earns up to ${rules.daily_points_cap} points, with ${rules.total_points_cap} per round. Water above your goal adds no extra points.\n\nTies are kept: 1st, 1st, 3rd. Scores use ${rules.points_decimals} decimal places. Tied players share the same medal. You must score points to earn a medal or reward.\n\nEvery 1st place gets one free, independent draw:\n${rewards}\n\nSync within 24 hours of recording. To count for the group, logs must arrive before midnight in the group timezone. After midnight, they only count toward personal history. Results and rewards become final once all photo votes close (up to 12 hours after a submission).\n\nJoining the group is only allowed before the first round starts. The leader starts the next round manually for the following midnight. Group settings can enable automatic restart after day 7. At least 2 members are required. Personal XP, Pro and potions do not change the standings.`;
  }
  const rewards = rules.rewards.map(reward => `${reward.probability}%: ${reward.type === 'xp' ? `+${reward.amount} XP` : reward.type === 'streak_freeze' ? `${reward.amount} poção de congelamento` : `${reward.amount} poção de reacender`}`).join('\n');
  return `De 2 a 5 pessoas, durante 7 dias no fuso do grupo.\n\nA referência diária do placar é ${rules.daily_goal_ml ?? 2000} ml para todos, independentemente da meta pessoal. Cada dia vale até ${rules.daily_points_cap} pontos e a rodada até ${rules.total_points_cap}. Beber além da meta não dá pontos extras.\n\nEmpates são mantidos: 1º, 1º, 3º. Pontos são comparados com ${rules.points_decimals} casas decimais. Ouro, prata e bronze seguem a posição, inclusive nos empates. É preciso pontuar para receber medalha ou prêmio.\n\nCada 1º lugar recebe um sorteio gratuito e independente:\n${rewards}\n\nSincronize em até 24 horas após registrar. Para pontuar no grupo, o envio deve chegar antes da meia-noite no fuso da equipe. Depois da virada, a marcação fica apenas no histórico pessoal. Resultado e prêmios ficam definitivos após encerrar também as votações de fotos (até 12 horas após cada envio).\n\nSó é possível entrar no grupo antes do início da primeira rodada. O responsável inicia a próxima rodada manualmente para a meia-noite seguinte. Nas configurações do grupo, pode ativar o reinício automático após o sétimo dia. São necessários pelo menos 2 integrantes. XP pessoal, plano Pro e poções não mudam o placar.`;
}

function standingsMessage(challenge: HydrationChallenge, locale: AppLocale): string {
  const deadline = challenge.review_deadline_at ?? challenge.sync_deadline_at;
  if (locale === 'es-ES') {
    const state = challenge.status === 'completed' ? 'Resultado definitivo.' : challenge.status === 'settling'
      ? `Esperando sincronizaciones y votaciones hasta ${deadline ? new Date(deadline).toLocaleTimeString(locale, {timeZone: challenge.progress.timezone, hour: '2-digit', minute: '2-digit'}) : 'el plazo final'} (${challenge.progress.timezone}). Las medallas son provisionales.`
      : 'Clasificación provisional. Las medallas se confirman al finalizar.';
    const rows = challenge.leaderboard?.map(entry => `${entry.rank === null ? 'Sin posición' : `${entry.rank}.º${entry.tied ? ' (empate)' : ''}`} · ${entry.display_name}${entry.is_you ? ' · Tú' : ''}\n${formatPoints(entry.points, locale)} puntos · ${formatPoints(entry.percentage, locale)}% de la ronda\n${formatPoints(entry.total_ml, locale)} ml · meta de ${formatPoints(entry.goal_ml, locale)} ml/día`).join('\n\n') ?? '';
    const reward = challenge.reward?.state === 'claimed' ? `\n\nPremio recibido: ${challenge.reward.type === 'xp' ? `+${challenge.reward.amount} XP` : challenge.reward.type === 'streak_freeze' ? '1 poción para congelar la racha' : '1 poción para recuperar la racha'}.` : '';
    return `${challenge.progress.starts_on.split('-').reverse().join('/')} – ${challenge.progress.ends_on.split('-').reverse().join('/')}\n${state}\n\n${rows}${reward}`;
  }
  if (locale === 'en-US') {
    const state = challenge.status === 'completed' ? 'Final results.' : challenge.status === 'settling' ? `Waiting for sync and photo votes until ${deadline ? new Date(deadline).toLocaleTimeString(locale, {timeZone: challenge.progress.timezone, hour: '2-digit', minute: '2-digit'}) : 'the deadline'} (${challenge.progress.timezone}). Medals are provisional.` : 'Projected standings. Medals are confirmed after finalization.';
    const rows = challenge.leaderboard?.map(entry => `${entry.rank === null ? 'Unranked' : `#${entry.rank}${entry.tied ? ' (tied)' : ''}`} · ${entry.display_name}${entry.is_you ? ' · You' : ''}\n${formatPoints(entry.points, locale)} points · ${formatPoints(entry.percentage, locale)}% of the round\n${formatPoints(entry.total_ml, locale)} ml · ${formatPoints(entry.goal_ml, locale)} ml daily goal`).join('\n\n') ?? '';
    const reward = challenge.reward?.state === 'claimed' ? `\n\nReward received: ${challenge.reward.type === 'xp' ? `+${challenge.reward.amount} XP` : challenge.reward.type === 'streak_freeze' ? '1 streak freeze potion' : '1 streak revival potion'}.` : '';
    return `${challenge.progress.starts_on} – ${challenge.progress.ends_on}\n${state}\n\n${rows}${reward}`;
  }
  const state = challenge.status === 'completed' ? 'Resultado definitivo.' : challenge.status === 'settling'
    ? `Aguardando sincronizações e votações até ${deadline ? new Date(deadline).toLocaleTimeString('pt-BR', {timeZone: challenge.progress.timezone, hour: '2-digit', minute: '2-digit'}) : 'o prazo final'} (${challenge.progress.timezone}). Medalhas ainda provisórias.`
    : 'Classificação projetada. Medalhas confirmadas após o fechamento.';
  const rows = challenge.leaderboard?.map(entry => `${entry.rank === null ? '—' : `${entry.rank}º${entry.tied ? ' (empate)' : ''}`} · ${entry.display_name}${entry.is_you ? ' · Você' : ''}\n${formatPoints(entry.points)} pontos · ${formatPoints(entry.percentage)}% da rodada\n${formatPoints(entry.total_ml)} ml · meta de ${formatPoints(entry.goal_ml)} ml/dia`).join('\n\n') ?? '';
  const reward = challenge.reward?.state === 'claimed' ? `\n\nSeu prêmio já foi recebido: ${challenge.reward.type === 'xp' ? `+${challenge.reward.amount} XP` : challenge.reward.type === 'streak_freeze' ? '1 poção de congelamento' : '1 poção de reacender'}.` : '';
  return `${challenge.progress.starts_on.split('-').reverse().join('/')} a ${challenge.progress.ends_on.split('-').reverse().join('/')}\n${state}\n\n${rows}${reward}`;
}

const styles = StyleSheet.create({
  container: {paddingHorizontal: 16},
  link: {flexGrow: 1, flexShrink: 1},
  links: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4},
  notice: {fontSize: 11, lineHeight: 15, color: challengeTheme.colors.muted, paddingBottom: 5},
});
