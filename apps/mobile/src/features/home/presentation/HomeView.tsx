import React, {useState} from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {ChallengeBackground} from './challenge/ChallengeBackground';
import {ChallengeHeader} from './challenge/ChallengeHeader';
import {ChallengeSceneDecoration} from './challenge/ChallengeSceneDecoration';
import {ChallengeTimeline} from './challenge/ChallengeTimeline';
import {ChallengeModeToggle, type ChallengeMode} from './challenge/ChallengeModeToggle';
import {DrinkWaterButton} from './challenge/DrinkWaterButton';
import {ChallengeStartCard} from './challenge/ChallengeStartCard';
import {SoloRewardDialog} from './challenge/SoloRewardDialog';
import {challengeTheme} from './challenge/challengeTheme';

interface Props {
  data?: HydrationHomeData;
  loading: boolean;
  refreshing?: boolean;
  error?: string;
  offline: boolean;
  syncing: boolean;
  pending: number;
  recordedAmountMl?: number;
  displayName: string;
  avatarId?: string | null;
  streak: number;
  xp: number;
  motionEnabled?: boolean;
  onRetry: () => void;
  onOpenHydration: () => void;
  onOpenInventory: () => void;
  startingChallenge?: boolean;
  challengeError?: string;
  onStartChallenge?: (mode: ChallengeMode) => void;
  onClaimReward?: (id: string) => Promise<unknown>;
}

export function HomeView({motionEnabled = true, ...props}: Props): React.JSX.Element {
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('solo');
  const [rewardOpen, setRewardOpen] = useState(false);

  if (props.loading && !props.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando hidratação" size="large" color={challengeTheme.colors.cyan} />
      </View>
    );
  }

  if (props.error && !props.data) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>
        <PrimaryButton label="Tentar novamente" onPress={props.onRetry} />
      </View>
    );
  }

  const today = props.data?.today;
  const condition = props.data?.mascot.condition ?? 'empty';
  const challenges = props.data?.challenges;
  const groupAvailable = Boolean(challenges?.group_name);
  const mode = challengeMode === 'group' && groupAvailable ? 'group' : 'solo';
  const challenge = challenges?.[mode];

  return (
    <View style={styles.page}>
      <ChallengeBackground />
      {motionEnabled ? <ChallengeSceneDecoration /> : null}
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ChallengeHeader
            condition={condition}
            streak={props.streak}
            waterMl={today?.total_ml ?? 0}
            xp={props.xp}
            onOpenInventory={props.onOpenInventory}
          />

          {props.offline || props.pending > 0 || props.syncing ? (
            <Text accessibilityLiveRegion="polite" style={styles.offline}>
              {props.syncing
                ? 'Sincronizando…'
                : props.pending > 0
                  ? `${props.pending} registro(s) aguardando sincronização`
                  : 'Modo offline'}
            </Text>
          ) : null}
        </View>

        <ChallengeModeToggle mode={mode} groupAvailable={groupAvailable} onChange={setChallengeMode} />
        {challenge?.status === 'active' ? (
          <ChallengeTimeline
            week={challenge.progress}
            mode={mode}
            reward={challenge.reward}
            onReward={() => setRewardOpen(true)}
            motionEnabled={motionEnabled}
            refreshing={props.refreshing}
            onRefresh={props.onRetry}
          />
        ) : <ScrollView contentContainerStyle={styles.startContent} refreshControl={<RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRetry} tintColor={challengeTheme.colors.cyan} />}>
          <ChallengeStartCard mode={mode} challenge={challenge} today={today} motionEnabled={motionEnabled}
            canStart={mode === 'solo' || Boolean(challenges?.can_start_group)} starting={props.startingChallenge}
            error={props.challengeError} onStart={() => props.onStartChallenge?.(mode)} onReward={() => setRewardOpen(true)} />
        </ScrollView>}

        <View style={styles.fixedActions}>
          <DrinkWaterButton onPress={props.onOpenHydration} />

          {props.recordedAmountMl ? (
            <Text accessibilityLiveRegion="polite" style={styles.confirmation}>+{props.recordedAmountMl} ml registrados!</Text>
          ) : (today?.total_ml ?? 0) === 0 ? (
            <Text style={styles.empty}>Sua primeira gota de hoje está a um toque.</Text>
          ) : null}

        </View>

      </SafeAreaView>
      {rewardOpen && challenges?.solo ? <SoloRewardDialog challenge={challenges.solo} onClaim={props.onClaimReward ?? (async () => undefined)} onClose={() => setRewardOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  safeArea: {flex: 1, zIndex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, backgroundColor: challengeTheme.colors.background},
  error: {color: challengeTheme.colors.danger, textAlign: 'center'},
  header: {paddingHorizontal: 16, paddingTop: 7},
  startContent: {flexGrow: 1},
  fixedActions: {paddingHorizontal: 16, paddingTop: 2, paddingBottom: 3},
  offline: {
    marginBottom: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panelSoft,
    color: '#B2EEF4', textAlign: 'center', fontSize: 11,
  },
  empty: {height: 15, marginTop: 2, color: '#9FC7DD', textAlign: 'center', fontSize: 10, lineHeight: 13},
  confirmation: {marginTop: 2, color: challengeTheme.colors.cyanStrong, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '800'},
});
