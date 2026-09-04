export type ReminderWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ReminderWeekdayOption {
  value: ReminderWeekday;
  shortLabel: string;
  accessibilityLabel: string;
}

// The visual order follows the Brazilian convention while each value matches Date#getDay.
export const REMINDER_WEEKDAY_OPTIONS: readonly ReminderWeekdayOption[] = [
  {value: 1, shortLabel: 'Seg', accessibilityLabel: 'Segunda-feira'},
  {value: 2, shortLabel: 'Ter', accessibilityLabel: 'Terça-feira'},
  {value: 3, shortLabel: 'Qua', accessibilityLabel: 'Quarta-feira'},
  {value: 4, shortLabel: 'Qui', accessibilityLabel: 'Quinta-feira'},
  {value: 5, shortLabel: 'Sex', accessibilityLabel: 'Sexta-feira'},
  {value: 6, shortLabel: 'Sáb', accessibilityLabel: 'Sábado'},
  {value: 0, shortLabel: 'Dom', accessibilityLabel: 'Domingo'},
];

export const ALL_REMINDER_WEEKDAYS: readonly ReminderWeekday[] = REMINDER_WEEKDAY_OPTIONS.map(
  option => option.value,
);

export function normalizeReminderWeekdays(value: unknown): ReminderWeekday[] {
  if (!Array.isArray(value)) return [];

  const selected = new Set(value.filter(isReminderWeekday));
  return ALL_REMINDER_WEEKDAYS.filter(weekday => selected.has(weekday));
}

export function formatReminderWeekdays(value: readonly ReminderWeekday[]): string {
  const weekdays = normalizeReminderWeekdays(value);
  if (weekdays.length === 0) return 'Nenhum dia';
  if (weekdays.length === ALL_REMINDER_WEEKDAYS.length) return 'Todos os dias';
  if (sameWeekdays(weekdays, [1, 2, 3, 4, 5])) return 'Seg a Sex';
  if (sameWeekdays(weekdays, [6, 0])) return 'Sáb e Dom';

  const labels = REMINDER_WEEKDAY_OPTIONS
    .filter(option => weekdays.includes(option.value))
    .map(option => option.shortLabel);

  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

function isReminderWeekday(value: unknown): value is ReminderWeekday {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;
}

function sameWeekdays(left: readonly ReminderWeekday[], right: readonly ReminderWeekday[]): boolean {
  return left.length === right.length && left.every((weekday, index) => weekday === right[index]);
}
