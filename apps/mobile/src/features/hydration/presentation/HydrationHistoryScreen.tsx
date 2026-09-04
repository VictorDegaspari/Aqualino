import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationLogs} from './useHydrationLogs';
import {HydrationWaterGauge} from './HydrationWaterGauge';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {weekday: 'short', day: '2-digit', month: 'short'});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {hour: '2-digit', minute: '2-digit'});

export function HydrationHistoryScreen(): React.JSX.Element {
  const timezone = useSessionStore(state => state.user?.profile.timezone ?? 'America/Sao_Paulo');
  const dates = useMemo(() => recentDates(timezone), [timezone]);
  const [selectedDate, setSelectedDate] = useState(() => dates[0]?.value ?? formatDate(new Date(), timezone));
  const query = useHydrationLogs(selectedDate);
  const logs = query.data?.data ?? [];
  const total = logs.reduce((sum, log) => sum + log.amount_ml, 0);
  const refresh = () => query.refetch().then(() => undefined);

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={refresh} tintColor={challengeTheme.colors.cyan} />}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.iconOrb}><AqualinoIcon name="history" size={38} color={challengeTheme.colors.cyanStrong} /></View>
            <Text accessibilityRole="header" style={styles.title}>Histórico</Text>
            <Text style={styles.subtitle}>Acompanhe cada gota dos últimos sete dias.</Text>
          </View>

          <HydrationWaterGauge totalMl={total} />

          <View style={styles.daySelector} accessibilityRole="tablist">
            {dates.map(date => {
              const selected = date.value === selectedDate;
              return (
                <Pressable
                  key={date.value}
                  accessibilityRole="tab"
                  accessibilityLabel={date.label}
                  accessibilityState={{selected}}
                  onPress={() => setSelectedDate(date.value)}
                  style={({pressed}) => [styles.day, selected && styles.daySelected, pressed && styles.dayPressed]}>
                  <Text style={[styles.dayWeekday, selected && styles.daySelectedText]}>{date.weekday}</Text>
                  <Text style={[styles.dayNumber, selected && styles.daySelectedText]}>{date.day}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.panelDate}>{dateFormatter.format(new Date(`${selectedDate}T12:00:00Z`))}</Text>
                <Text style={styles.panelTotal}>{formatMl(total)} registrados</Text>
              </View>
              <View style={styles.totalIcon}><AqualinoIcon name="water" size={26} color={challengeTheme.colors.cyanStrong} /></View>
            </View>

            {query.isLoading ? <ActivityIndicator accessibilityLabel="Carregando histórico" color={challengeTheme.colors.cyan} style={styles.loader} /> : null}
            {query.error ? (
              <View style={styles.emptyState}>
                <Text accessibilityRole="alert" style={styles.error}>Não foi possível carregar os registros.</Text>
                <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}><Text style={styles.retryLabel}>Tentar novamente</Text></Pressable>
              </View>
            ) : null}
            {!query.isLoading && !query.error && logs.length === 0 ? (
              <View style={styles.emptyState}>
                <AqualinoIcon name="water" size={32} color={challengeTheme.colors.borderStrong} />
                <Text style={styles.emptyTitle}>Ainda não há registros</Text>
                <Text style={styles.emptyText}>Quando você beber água, ela aparecerá aqui.</Text>
              </View>
            ) : null}
            {!query.isLoading && !query.error && logs.map(log => (
              <View key={log.id} style={styles.log}>
                <View style={styles.logIcon}><AqualinoIcon name="water" size={21} color={challengeTheme.colors.cyanStrong} /></View>
                <View style={styles.logContent}>
                  <Text style={styles.logAmount}>{formatMl(log.amount_ml)}</Text>
                  <Text style={styles.logSource}>{sourceLabel(log.source)}</Text>
                </View>
                <Text style={styles.logTime}>{timeFormatter.format(new Date(log.occurred_at))}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function recentDates(timezone: string) {
  return Array.from({length: 7}, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - index);
    const value = formatDate(date, timezone);
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day, 12));
    return {
      value,
      label: dateFormatter.format(localDate),
      weekday: new Intl.DateTimeFormat('pt-BR', {weekday: 'narrow'}).format(localDate).toUpperCase(),
      day: String(day),
    };
  });
}

function formatMl(value: number): string {
  return `${new Intl.NumberFormat('pt-BR').format(value)} ml`;
}

function sourceLabel(source: 'mobile' | 'widget' | 'shortcut' | 'import'): string {
  return {mobile: 'Pelo app', widget: 'Pelo widget', shortcut: 'Atalho', import: 'Importado'}[source];
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.72},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.54)'},
  safeArea: {flex: 1},
  scroll: {flex: 1},
  content: {paddingHorizontal: 18, paddingVertical: 26, gap: 20},
  hero: {alignItems: 'center', gap: 7},
  iconOrb: {width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 225, 236, 0.14)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.56)'},
  title: {fontSize: 29, lineHeight: 36, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {fontSize: 15, lineHeight: 21, color: challengeTheme.colors.muted},
  daySelector: {flexDirection: 'row', justifyContent: 'space-between', gap: 5},
  day: {width: 42, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  daySelected: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.cyanStrong},
  dayPressed: {opacity: 0.78, transform: [{scale: 0.96}]},
  dayWeekday: {fontSize: 11, lineHeight: 14, fontWeight: '800', color: challengeTheme.colors.muted},
  dayNumber: {fontSize: 18, lineHeight: 23, fontWeight: '900', color: challengeTheme.colors.text},
  daySelectedText: {color: challengeTheme.colors.backgroundDeep},
  panel: {minHeight: 260, padding: 19, borderRadius: challengeTheme.radius.panel, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  panelHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: challengeTheme.colors.border},
  panelDate: {fontSize: 17, lineHeight: 23, fontWeight: '900', color: challengeTheme.colors.text, textTransform: 'capitalize'},
  panelTotal: {marginTop: 2, fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted},
  totalIcon: {width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 225, 236, 0.12)'},
  loader: {marginTop: 50},
  emptyState: {minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 22},
  emptyTitle: {fontSize: 16, lineHeight: 21, fontWeight: '800', color: challengeTheme.colors.text},
  emptyText: {textAlign: 'center', fontSize: 13, lineHeight: 19, color: challengeTheme.colors.muted},
  error: {textAlign: 'center', color: challengeTheme.colors.danger},
  retryButton: {marginTop: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: challengeTheme.colors.cyanStrong},
  retryLabel: {fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  log: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(23, 75, 115, 0.7)'},
  logIcon: {width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 225, 236, 0.11)'},
  logContent: {flex: 1},
  logAmount: {fontSize: 16, lineHeight: 21, fontWeight: '900', color: challengeTheme.colors.text},
  logSource: {fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  logTime: {fontSize: 14, lineHeight: 19, fontWeight: '800', color: challengeTheme.colors.cyanStrong},
});
