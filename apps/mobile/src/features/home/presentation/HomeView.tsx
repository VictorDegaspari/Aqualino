import {useTranslation} from '../../../shared/i18n/useTranslation';
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {ChallengeHeader} from './challenge/ChallengeHeader';
import {ChallengeTimeline} from './challenge/ChallengeTimeline';
import {ChallengeModeToggle, type ChallengeMode} from './challenge/ChallengeModeToggle';
import {DrinkWaterButton} from './challenge/DrinkWaterButton';
import {ChallengeStartCard} from './challenge/ChallengeStartCard';
import {SoloRewardDialog} from './challenge/SoloRewardDialog';
import {challengeTheme} from './challenge/challengeTheme';
import {HomeLoading} from './HomeLoading';
import {GroupChallengePanel} from './challenge/GroupChallengePanel';
import {GroupChallengeTrophy} from './challenge/GroupChallengeTrophy';
import {defaultHomeThemeId, type HomeThemeId} from '../domain/homeThemes';
import {HomeScene} from './HomeScene';
import {HomeRefreshScrollView} from './HomeRefreshScrollView';
import {HydrationSuccessFeedback} from './HydrationSuccessFeedback';

interface Props {
  data?: HydrationHomeData;
  loading: boolean;
  error?: string;
  offline: boolean;
  syncing: boolean;
  pending: number;
  recordedAmountMl?: number;
  onDismissRecorded?: () => void;
  displayName: string;
  avatarId?: string | null;
  streak: number;
  xp: number;
  level?: number;
  motionEnabled?: boolean;
  homeThemeId?: HomeThemeId;
  onRetry: () => void;
  onRefresh?: () => Promise<unknown> | void;
  onOpenHydration: () => void;
  onOpenInventory: () => void;
  startingChallenge?: boolean;
  challengeError?: string;
  onStartChallenge?: (mode: ChallengeMode) => void;
  onClaimReward?: (id: string) => Promise<unknown>;
}

export function HomeView({motionEnabled = true, homeThemeId = defaultHomeThemeId, ...props}: Props): React.JSX.Element {
  const {locale, t} = useTranslation();
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('solo');
  const [rewardOpen, setRewardOpen] = useState(false);

  if (props.loading && !props.data) {
    return <HomeLoading />;
  }

  if (props.error && !props.data) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>{props.error}</Text>
        <PrimaryButton label={t("Tentar novamente", "Try again", "Intentar de nuevo")} onPress={props.onRetry} />
      </View>
    );
  }

  const today = props.data?.today;
  const condition = props.data?.mascot.condition ?? 'empty';
  const challenges = props.data?.challenges;
  const groupAvailable = Boolean(challenges?.group_name);
  const mode = challengeMode === 'group' && groupAvailable ? 'group' : 'solo';
  const challenge = challenges?.[mode];
  const showTimeline = challenge?.status === 'active' && challenge.participating !== false;
  const groupPanel = mode === 'group' ? <GroupChallengePanel locale={locale} challenge={challenge} result={challenges?.group_result} rules={challenges?.group_rules} offline={props.offline || props.pending > 0} /> : null;
  const startCard = <ChallengeStartCard mode={mode} challenge={challenge} today={today} motionEnabled={motionEnabled}
    canStart={mode === 'solo' || Boolean(challenges?.can_start_group)} starting={props.startingChallenge}
    error={props.challengeError} onStart={() => props.onStartChallenge?.(mode)} onReward={() => setRewardOpen(true)} />;

  return (
    <View style={styles.page}>
      <HomeScene themeId={homeThemeId} motionEnabled={motionEnabled} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ChallengeHeader
            condition={condition}
            streak={props.streak}
            waterMl={today?.total_ml ?? 0}
            xp={props.xp}
            level={props.level}
            onOpenInventory={props.onOpenInventory}
          />

          {props.offline || props.pending > 0 || props.syncing ? (
            <Text accessibilityLiveRegion="polite" style={styles.offline}>
              {props.syncing
                ? t("Sincronizando…", "Syncing…", "Sincronizando…")
                : props.pending > 0
                  ? t(`${props.pending} para sincronizar`, `${props.pending} to sync`, `${props.pending} por sincronizar`)
                  : t("Modo offline", "Offline mode", "Modo sin conexión")}
            </Text>
          ) : null}
        </View>

        <ChallengeModeToggle mode={mode} groupAvailable={groupAvailable} onChange={setChallengeMode} />
        {showTimeline ? groupPanel : null}
        {showTimeline ? (
          <ChallengeTimeline
            week={challenge.progress}
            mode={mode}
            reward={challenge.reward}
            onReward={() => setRewardOpen(true)}
            motionEnabled={motionEnabled}
            onRefresh={props.onRefresh ?? props.onRetry}
            footer={mode === 'group' ? <GroupChallengeTrophy challenge={challenge} /> : undefined}
          />
        ) : <HomeRefreshScrollView contentContainerStyle={[styles.startContent, mode === 'group' && styles.groupStartContent]} motionEnabled={motionEnabled} onRefresh={props.onRefresh ?? props.onRetry}>
          {mode === 'group' ? <View style={styles.groupStartPanel}>
            {startCard}
            {groupPanel}
          </View> : startCard}
        </HomeRefreshScrollView>}

        {mode === 'solo' || showTimeline ? <View style={styles.fixedActions}>
          <DrinkWaterButton onPress={props.onOpenHydration} />

          {props.recordedAmountMl ? (
            <HydrationSuccessFeedback
              amountMl={props.recordedAmountMl}
              accessibilityLabel={t(`${props.recordedAmountMl} ml registrados`, `${props.recordedAmountMl} ml recorded`, `${props.recordedAmountMl} ml registrados`)}
              onDismiss={props.onDismissRecorded}
            />
          ) : (today?.total_ml ?? 0) === 0 ? (
            <Text style={styles.empty}>{t("Sua primeira gota de hoje está a um toque.", "Your first drop today is one tap away.", "Tu primera gota de hoy está a un toque.")}</Text>
          ) : null}

        </View> : null}

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
  groupStartContent: {justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 20},
  groupStartPanel: {
    width: '100%', maxWidth: 420, alignSelf: 'center', paddingBottom: 16,
    borderRadius: 26, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: '#102B3B',
  },
  fixedActions: {paddingHorizontal: 16, paddingTop: 2, paddingBottom: 3},
  offline: {
    alignSelf: 'center', marginBottom: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: challengeTheme.colors.panelSoft,
    color: '#B2EEF4', textAlign: 'center', fontSize: 10, lineHeight: 14,
  },
  empty: {height: 15, marginTop: 2, color: '#9FC7DD', textAlign: 'center', fontSize: 10, lineHeight: 13},
});
