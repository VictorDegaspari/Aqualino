import React from 'react';
import {ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {tokens} from '@aqualino/design-tokens';
import {Screen} from '../../../shared/components/Screen';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {AqualinoMascot} from './AqualinoMascot';
import {WeeklyChallengeTrail} from './WeeklyChallengeTrail';

interface Props {
  data?: HydrationHomeData;
  loading: boolean;
  refreshing?: boolean;
  error?: string;
  offline: boolean;
  syncing: boolean;
  pending: number;
  volumes: number[];
  displayName: string;
  streak: number;
  level: number;
  onHydrate: (amount: number) => void;
  onRetry: () => void;
  onOpenInventory: () => void;
  onSignOut: () => void;
}

export function HomeView(props: Props): React.JSX.Element {
  if (props.loading && !props.data) {
    return <View style={styles.center}><ActivityIndicator accessibilityLabel="Carregando hidratação" size="large" /></View>;
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
  const progress = Math.min(100, Math.max(0, today?.percentage ?? 0));

  return (
    <Screen refreshControl={<RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRetry} />}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Olá, {props.displayName}</Text><Text style={styles.meta}>Nível {props.level} · 🔥 {props.streak} dias</Text></View>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" onPress={props.onOpenInventory} style={styles.headerAction}>
            <Text>Inventário</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={props.onSignOut} style={styles.headerAction}><Text>Sair</Text></Pressable>
        </View>
      </View>
      {(props.offline || props.pending > 0 || props.syncing) ? (
        <Text accessibilityRole="status" style={styles.offline}>
          {props.syncing ? 'Sincronizando…' : props.pending > 0 ? `${props.pending} registro(s) aguardando sincronização` : 'Modo offline'}
        </Text>
      ) : null}
      <View style={styles.hero}>
        <AqualinoMascot condition={props.data?.mascot.condition ?? 'empty'} />
        <Text style={styles.total}>{today?.total_ml ?? 0} ml</Text>
        <Text style={styles.goal}>de {today?.goal_ml ?? 0} ml · {today?.percentage ?? 0}%</Text>
        <View style={styles.track} accessibilityRole="progressbar"
          accessibilityValue={{min: 0, max: 100, now: progress}}>
          <View style={[styles.fill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.quickTitle}>Registrar agora</Text>
        <View style={styles.volumes}>
          {props.volumes.map(volume => (
            <Pressable key={volume} accessibilityRole="button" accessibilityLabel={`Registrar ${volume} mililitros`}
              onPress={() => props.onHydrate(volume)} style={({pressed}) => [styles.volume, pressed && styles.pressed]}>
              <Text style={styles.volumeAmount}>{volume}</Text><Text style={styles.volumeUnit}>ml</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {(today?.total_ml ?? 0) === 0 ? <Text style={styles.empty}>Sua primeira gota de hoje está a um toque.</Text> : null}
      {props.data?.week ? <WeeklyChallengeTrail week={props.data.week} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24},
  error: {color: tokens.color.danger, textAlign: 'center'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  greeting: {fontSize: tokens.fontSize.lg, fontWeight: '800', color: tokens.color.text},
  meta: {color: tokens.color.textMuted, marginTop: 4},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs},
  headerAction: {minHeight: 44, minWidth: 44, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center'},
  offline: {padding: 10, borderRadius: tokens.radius.sm, backgroundColor: '#FFF1DC', color: '#78410E'},
  hero: {backgroundColor: tokens.color.surface, padding: tokens.spacing.lg, borderRadius: tokens.radius.lg, gap: 6},
  total: {fontSize: tokens.fontSize.xl, fontWeight: '800', color: tokens.color.primaryStrong, textAlign: 'center'},
  goal: {color: tokens.color.textMuted, textAlign: 'center'},
  track: {height: 12, borderRadius: 6, backgroundColor: tokens.color.border, overflow: 'hidden', marginTop: 8},
  fill: {height: '100%', borderRadius: 6, backgroundColor: tokens.color.accent},
  empty: {textAlign: 'center', color: tokens.color.textMuted},
  quickTitle: {fontSize: tokens.fontSize.sm, color: tokens.color.text, fontWeight: '800', marginTop: 8},
  volumes: {flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm},
  volume: {minWidth: 76, minHeight: 56, flexGrow: 1, backgroundColor: tokens.color.primary, borderRadius: tokens.radius.md,
    alignItems: 'center', justifyContent: 'center'},
  volumeAmount: {fontSize: tokens.fontSize.lg, fontWeight: '800', color: '#FFFFFF'},
  volumeUnit: {fontSize: tokens.fontSize.sm, color: '#D9FFFF'},
  pressed: {opacity: 0.75},
});
