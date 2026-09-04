import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {ChallengeBackground} from './challenge/ChallengeBackground';
import {ChallengeBottomNavigation} from './challenge/ChallengeBottomNavigation';
import {ChallengeHeader} from './challenge/ChallengeHeader';
import {ChallengeSceneDecoration} from './challenge/ChallengeSceneDecoration';
import {ChallengeTimeline} from './challenge/ChallengeTimeline';
import {DrinkWaterButton} from './challenge/DrinkWaterButton';
import {GroupLeaderboard} from './challenge/GroupLeaderboard';
import {challengeTheme} from './challenge/challengeTheme';

interface Props {
  data?: HydrationHomeData;
  loading: boolean;
  refreshing?: boolean;
  error?: string;
  offline: boolean;
  syncing: boolean;
  pending: number;
  displayName: string;
  streak: number;
  xp: number;
  onRetry: () => void;
  onOpenHydration: () => void;
  onOpenInventory: () => void;
  onSignOut: () => void;
}

export function HomeView(props: Props): React.JSX.Element {
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

  return (
    <View style={styles.page}>
      <ChallengeBackground />
      <ChallengeSceneDecoration />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <ChallengeHeader
            condition={condition}
            streak={props.streak}
            waterMl={today?.total_ml ?? 0}
            xp={props.xp}
            onOpenInventory={props.onOpenInventory}
            onSignOut={props.onSignOut}
          />

          {props.offline || props.pending > 0 || props.syncing ? (
            <Text accessibilityRole="status" style={styles.offline}>
              {props.syncing
                ? 'Sincronizando…'
                : props.pending > 0
                  ? `${props.pending} registro(s) aguardando sincronização`
                  : 'Modo offline'}
            </Text>
          ) : null}
        </View>

        {props.data?.week ? (
          <ChallengeTimeline week={props.data.week} refreshing={props.refreshing} onRefresh={props.onRetry} />
        ) : <View style={styles.timelineFallback} />}

        <View style={styles.fixedActions}>
          <DrinkWaterButton onPress={props.onOpenHydration} />

          {(today?.total_ml ?? 0) === 0 ? (
            <Text style={styles.empty}>Sua primeira gota de hoje está a um toque.</Text>
          ) : null}

          <GroupLeaderboard displayName={props.displayName} />
        </View>

        <ChallengeBottomNavigation onOpenProfile={props.onOpenInventory} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  safeArea: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, backgroundColor: challengeTheme.colors.background},
  error: {color: challengeTheme.colors.danger, textAlign: 'center'},
  header: {paddingHorizontal: 16, paddingTop: 7},
  timelineFallback: {flex: 1},
  fixedActions: {paddingHorizontal: 16, paddingTop: 2, paddingBottom: 3, backgroundColor: 'rgba(0, 14, 32, 0.56)'},
  offline: {
    marginBottom: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panelSoft,
    color: '#B2EEF4', textAlign: 'center', fontSize: 11,
  },
  empty: {height: 15, marginTop: 2, color: '#9FC7DD', textAlign: 'center', fontSize: 10, lineHeight: 13},
});
