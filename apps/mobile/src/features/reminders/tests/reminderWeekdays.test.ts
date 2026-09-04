import {formatReminderWeekdays, normalizeReminderWeekdays} from '../application/reminderWeekdays';

test('normalizes weekdays into their display order and removes duplicates', () => {
  expect(normalizeReminderWeekdays([0, 5, 1, 1, 9, '2'])).toEqual([1, 5, 0]);
});

test.each([
  [[1, 2, 3, 4, 5, 6, 0], 'Todos os dias'],
  [[1, 2, 3, 4, 5], 'Seg a Sex'],
  [[6, 0], 'Sáb e Dom'],
  [[1, 3, 5], 'Seg, Qua e Sex'],
] as const)('formats %j as %s', (weekdays, expected) => {
  expect(formatReminderWeekdays(weekdays)).toBe(expected);
});
