import {useTranslation} from '../../../shared/i18n/useTranslation';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import React, {useMemo, useState} from 'react';
import {Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import type {HydrationLog} from '@aqualino/contracts';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {TabScreenHeader} from '../../../shared/components/TabScreenHeader';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationLogs} from './useHydrationLogs';
import {HydrationWaterGauge} from './HydrationWaterGauge';
import {useHydrationHomeData} from './useHydrationHome';
import {hydrationLogDate} from '../application/hydrationHistory';


export function HydrationHistoryScreen(): React.JSX.Element {
  const {locale, t} = useTranslation();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short'}), [locale]);
  const isFocused = useIsFocused();
  const timezone = useSessionStore(state => state.user?.profile.timezone ?? 'America/Sao_Paulo');
  const today = hydrationLogDate(new Date(), timezone);
  const dates = useMemo(() => recentDates(today, locale), [today, locale]);
  const [pickedDate, setSelectedDate] = useState<string | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const selectedDate = dates.find(day => day.value === pickedDate)?.value ?? today;
  const days = useHydrationLogs(dates.map(day => day.value), timezone);
  const query = days[dates.findIndex(day => day.value === selectedDate)];
  const home = useHydrationHomeData();
  const logs = query.data?.data ?? [];
  const total = totalLoggedMl(logs);
  const weekTotal = days.every(day => day.data !== undefined)
    ? days.reduce((sum, day) => sum + totalLoggedMl(day.data?.data ?? []), 0)
    : undefined;
  const average = weekTotal === undefined ? undefined : Math.round(weekTotal / dates.length);
  const weekError = days.some(day => day.isError && !day.data);
  const dataState = query.data ? 'ready' : query.isError ? 'error' : 'loading';
  const goalByDate = new Map(home.data?.data.week.days.map(day => [day.date, day.goal_ml]));
  const goalMlForDate = (date: string) => goalByDate.get(date) ?? home.data?.data.today.goal_ml;
  const goalMl = goalMlForDate(selectedDate);
  const achievedDates = new Set(dates.flatMap((date, index) => {
    const goal = goalMlForDate(date.value);
    return goal && totalLoggedMl(days[index]?.data?.data ?? []) >= goal ? [date.value] : [];
  }));
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {timeZone: timezone, hour: '2-digit', minute: '2-digit'}), [locale, timezone]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([...days.map(day => day.refetch()), home.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={challengeTheme.colors.cyan} />}
          showsVerticalScrollIndicator={false}>
          <TabScreenHeader
            title={t("Histórico", "History", "Historial")}
            subtitle={t("Acompanhe cada gota dos últimos sete dias.", "Follow every drop from the last seven days.", "Sigue cada gota de los últimos siete días.")}
            icon={<AqualinoIcon name="history" size={34} color={challengeTheme.colors.cyanStrong} />}
          />

          {isFocused ? <HydrationWaterGauge locale={locale} totalMl={total} goalMl={goalMl} isToday={selectedDate === today} date={selectedDate} dataState={dataState} /> : null}

          <View style={styles.daySelector} accessibilityRole="tablist">
            {dates.map(date => {
              const selected = date.value === selectedDate;
              const goalAchieved = achievedDates.has(date.value);
              return (
                <Pressable
                  key={date.value}
                  accessibilityRole="tab"
                  accessibilityLabel={`${date.label}${goalAchieved ? t(", meta atingida", ", goal reached", ", meta alcanzada") : ''}`}
                  accessibilityState={{selected}}
                  onPress={() => setSelectedDate(date.value)}
                  style={({pressed}) => [styles.day, selected && styles.daySelected, pressed && styles.dayPressed]}>
                  <Text style={[styles.dayWeekday, selected && styles.daySelectedText]}>{date.weekday}</Text>
                  <View style={styles.dayNumberRow}>
                    <Text style={[styles.dayNumber, selected && styles.daySelectedText]}>{date.day}</Text>
                    {goalAchieved ? <View testID={`history-goal-check-${date.value}`}><AqualinoIcon name="check" size={12} color={selected ? challengeTheme.colors.backgroundDeep : challengeTheme.colors.cyanStrong} /></View> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.weekSummary} accessibilityRole="summary">
            <View style={styles.totalIcon}><AqualinoIcon name="water" size={26} color={challengeTheme.colors.cyanStrong} /></View>
            <View style={styles.weekContent}>
              <Text style={styles.weekTitle}>{t("Média semanal", "Weekly average", "Promedio semanal")}</Text>
              <Text style={styles.weekAmount}>{average === undefined ? '—' : t(`${formatMl(average, locale)} / dia`, `${formatMl(average, locale)} / day`, `${formatMl(average, locale)} / día`)}</Text>
              <Text style={styles.weekCaption}>
                {weekTotal !== undefined
                  ? t(`${formatMl(weekTotal, locale)} nos últimos 7 dias, incluindo hoje`, `${formatMl(weekTotal, locale)} in the last 7 days, including today`, `${formatMl(weekTotal, locale)} en los últimos 7 días, incluido hoy`)
                  : weekError ? t("Não foi possível carregar a média.", "Could not load the average.", "No se pudo cargar el promedio.") : t("Calculando os últimos 7 dias…", "Calculating the last 7 days…", "Calculando los últimos 7 días…")}
              </Text>
              {weekError ? <Pressable accessibilityRole="button" accessibilityLabel={t("Recarregar média semanal", "Reload weekly average", "Actualizar el promedio semanal")} onPress={refresh} style={styles.weekRetry}><Text style={styles.retryLabel}>{t("Tentar novamente", "Try again", "Intentar de nuevo")}</Text></Pressable> : null}
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.panelDate}>{dateFormatter.format(new Date(`${selectedDate}T12:00:00Z`))}</Text>
                <Text style={styles.panelTotal}>{t(`${query.data ? formatMl(total, locale) : '— ml'} registrados`, `${query.data ? formatMl(total, locale) : '— ml'} recorded`, `${query.data ? formatMl(total, locale) : '— ml'} registrados`)}</Text>
              </View>
              <View style={styles.totalIcon}><AqualinoIcon name="water" size={26} color={challengeTheme.colors.cyanStrong} /></View>
            </View>

            {query.isLoading ? <LoadingWaterDrop accessibilityLabel={t("Carregando histórico", "Loading history", "Cargando el historial")} size={44} style={styles.loader} /> : null}
            {query.error ? (
              <View style={styles.emptyState}>
                <Text accessibilityRole="alert" style={styles.error}>{t("Não foi possível carregar os registros.", "Could not load the logs.", "No se pudieron cargar los registros.")}</Text>
                <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}><Text style={styles.retryLabel}>{t("Tentar novamente", "Try again", "Intentar de nuevo")}</Text></Pressable>
              </View>
            ) : null}
            {!query.isLoading && !query.error && logs.length === 0 ? (
              <View style={styles.emptyState}>
                <AqualinoIcon name="water" size={32} color={challengeTheme.colors.borderStrong} />
                <Text style={styles.emptyTitle}>{t("Ainda não há registros", "No logs yet", "Todavía no hay registros")}</Text>
                <Text style={styles.emptyText}>{t("Quando você beber água, ela aparecerá aqui.", "When you drink water, it will appear here.", "Cuando bebas agua, aparecerá aquí.")}</Text>
              </View>
            ) : null}
            {!query.isLoading && !query.error && logs.map(log => (
              <HistoryLog key={log.id} log={log} time={timeFormatter.format(new Date(log.occurred_at))} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function recentDates(today: string, locale: AppLocale) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short'});
  return Array.from({length: 7}, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - index);
    const value = date.toISOString().slice(0, 10);
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(Date.UTC(year, month - 1, day, 12));
    return {
      value,
      label: dateFormatter.format(localDate),
      weekday: new Intl.DateTimeFormat(locale, {timeZone: 'UTC', weekday: 'narrow'}).format(localDate).toUpperCase(),
      day: String(day),
    };
  });
}

function formatMl(value: number, locale: AppLocale): string {
  return `${new Intl.NumberFormat(locale).format(value)} ml`;
}

function HistoryLog({log, time}: {log: HydrationLog; time: string}): React.JSX.Element {
  const {locale, t} = useTranslation();
  const sources = {mobile: undefined, widget: t('Pelo widget', 'From widget', 'Desde el widget'), shortcut: t('Atalho', 'Shortcut', 'Atajo'), import: t('Importado', 'Imported', 'Importado')};
  const detail = log.invalidated_at ? t('Anulada pela maioria do grupo', 'Invalidated by the group majority', 'Anulado por la mayoría del grupo') : sources[log.source];
  return <View style={styles.log}>
    <View style={styles.logIcon}><AqualinoIcon name="water" size={21} color={challengeTheme.colors.cyanStrong} /></View>
    <View style={styles.logContent}>
      <Text style={[styles.logAmount, log.invalidated_at && styles.invalidAmount]}>{formatMl(log.amount_ml, locale)}</Text>
      {detail ? <Text style={styles.logSource}>{detail}</Text> : null}
    </View>
    <Text style={styles.logTime}>{time}</Text>
  </View>;
}

function totalLoggedMl(logs: HydrationLog[]): number {
  return logs.reduce((sum, log) => sum + (log.invalidated_at ? 0 : log.amount_ml), 0);
}

const styles = StyleSheet.create({
  invalidAmount: {textDecorationLine: 'line-through', color: challengeTheme.colors.danger},
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.72},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.54)'},
  safeArea: {flex: 1},
  scroll: {flex: 1},
  content: {paddingHorizontal: 18, paddingVertical: 26, gap: 20},
  daySelector: {flexDirection: 'row', justifyContent: 'space-between', gap: 5},
  day: {width: 42, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  daySelected: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.cyanStrong},
  dayPressed: {opacity: 0.78, transform: [{scale: 0.96}]},
  dayWeekday: {fontSize: 11, lineHeight: 14, fontWeight: '800', color: challengeTheme.colors.muted},
  dayNumberRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
  dayNumber: {fontSize: 18, lineHeight: 23, fontWeight: '900', color: challengeTheme.colors.text},
  daySelectedText: {color: challengeTheme.colors.backgroundDeep},
  weekSummary: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  weekContent: {flex: 1, gap: 4},
  weekTitle: {fontSize: 12, lineHeight: 17, fontWeight: '800', color: challengeTheme.colors.muted},
  weekAmount: {fontSize: 23, lineHeight: 30, fontWeight: '900', fontVariant: ['tabular-nums'], color: challengeTheme.colors.cyanStrong},
  weekCaption: {fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted},
  weekRetry: {alignSelf: 'flex-start', paddingVertical: 12},
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
