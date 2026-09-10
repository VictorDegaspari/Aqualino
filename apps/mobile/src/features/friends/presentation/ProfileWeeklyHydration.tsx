import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {ProfileHydrationWeek} from '@aqualino/contracts';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {friendshipStyles} from './friendshipStyles';

export function ProfileWeeklyHydration({week}: {week: ProfileHydrationWeek}): React.JSX.Element {
  const {t} = useTranslation();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const liters = (ml: number) => (ml / 1000).toLocaleString(locale, {maximumFractionDigits: 2});
  const date = (value: string, weekday = false) => new Date(`${value}T12:00:00Z`).toLocaleDateString(locale, weekday ? {weekday: 'short', timeZone: 'UTC'} : {day: '2-digit', month: '2-digit', timeZone: 'UTC'});
  const maxMl = Math.max(1000, ...week.days.map(day => day.total_ml));
  return <View style={friendshipStyles.panel} testID="profile-weekly-hydration">
    <Text accessibilityRole="header" style={friendshipStyles.heading}>{t('Progresso semanal', 'Weekly progress', 'Progreso semanal')}</Text>
    <Text style={friendshipStyles.muted}>{date(week.starts_on)} – {date(week.ends_on)}</Text>
    <Text style={styles.average}>{liters(week.average_daily_ml)} L<Text style={styles.unit}>{t('/dia', '/day', '/día')}</Text></Text>
    <Text style={friendshipStyles.muted}>{t('Média diária nesta semana, de segunda até hoje.', 'Daily average this week, from Monday through today.', 'Promedio diario esta semana, desde el lunes hasta hoy.')}</Text>
    <View style={styles.chart}>
      {week.days.map(day => {
        const future = day.date > week.current_date;
        const barHeight = future || day.total_ml === 0 ? 0 : Math.max(3, day.total_ml / maxMl * 110);
        const today = day.date === week.current_date;
        return <View key={day.date} accessible accessibilityLabel={`${day.date}: ${future ? t('Ainda não chegou', 'Upcoming', 'Próximamente') : `${liters(day.total_ml)} L`}`} style={styles.column}>
          <Text style={styles.value}>{future ? '—' : liters(day.total_ml)}</Text>
          <View style={styles.track}><View testID={`profile-water-${day.date}`} style={[styles.bar, {height: barHeight}, today && styles.today]} /></View>
          <Text style={[styles.day, today && styles.todayLabel]}>{date(day.date, true)}</Text>
        </View>;
      })}
    </View>
    <Text style={friendshipStyles.muted}>{t('Total da semana', 'Weekly total', 'Total semanal')}: {liters(week.total_ml)} L</Text>
  </View>;
}

const styles = StyleSheet.create({
  average: {fontSize: 32, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  unit: {fontSize: 16, color: challengeTheme.colors.muted},
  chart: {flexDirection: 'row', gap: 5, marginTop: 12},
  column: {flex: 1, alignItems: 'center', gap: 8},
  value: {fontSize: 11, color: challengeTheme.colors.text, fontWeight: '700'},
  track: {height: 110, width: '65%', justifyContent: 'flex-end', borderBottomWidth: 1, borderColor: challengeTheme.colors.border},
  bar: {width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: challengeTheme.colors.cyanStrong},
  today: {backgroundColor: challengeTheme.colors.gold},
  day: {fontSize: 10, color: challengeTheme.colors.muted},
  todayLabel: {color: challengeTheme.colors.gold, fontWeight: '800'},
});
