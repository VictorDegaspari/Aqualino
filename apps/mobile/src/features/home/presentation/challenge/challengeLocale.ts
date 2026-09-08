import type {HydrationWeekDayState} from '@aqualino/contracts';
import type {AppLocale} from '../../../../shared/i18n/appLocale';
import {dayStateLabels, weekdayLabels} from './challengeTheme';

const states: Record<AppLocale, Record<HydrationWeekDayState, string>> = {
  'pt-BR': dayStateLabels,
  'en-US': {future: 'Future', no_record: 'No logs', in_progress: 'In progress', goal_achieved: 'Goal reached', missed: 'Goal missed'},
  'es-ES': {future: 'Futuro', no_record: 'Sin registros', in_progress: 'En progreso', goal_achieved: 'Meta alcanzada', missed: 'Meta no alcanzada'},
};

export function dayStateLabel(state: HydrationWeekDayState, locale: AppLocale): string {
  return states[locale][state];
}

export function weekdayLabel(weekday: number, locale: AppLocale): string {
  if (locale === 'pt-BR') return weekdayLabels[weekday - 1];
  return new Intl.DateTimeFormat(locale, {weekday: 'short', timeZone: 'UTC'}).format(new Date(Date.UTC(2026, 8, 6 + weekday))).toUpperCase();
}

export function challengeDateLabel(date: string, locale: AppLocale): string {
  const parts = new Intl.DateTimeFormat(locale, {day: '2-digit', month: 'short', timeZone: 'UTC'}).formatToParts(new Date(`${date}T12:00:00Z`));
  return `${parts.find(part => part.type === 'day')?.value} ${parts.find(part => part.type === 'month')?.value.replace(/\.$/, '')}`.toUpperCase();
}
