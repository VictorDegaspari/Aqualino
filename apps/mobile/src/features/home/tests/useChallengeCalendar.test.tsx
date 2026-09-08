import {act, renderHook} from '@testing-library/react-native';
import type {HydrationWeek} from '@aqualino/contracts';
import {AppState, type AppStateStatus} from 'react-native';
import {useChallengeCalendar} from '../presentation/challenge/useChallengeCalendar';

const week: HydrationWeek = {
  mode: 'challenge', starts_on: '2026-09-02', ends_on: '2026-09-08', current_date: '2026-09-02',
  timezone: 'America/Sao_Paulo', completed_goal_days: 0, total_ml: 500,
  days: Array.from({length: 7}, (_, index) => ({
    date: `2026-09-${String(index + 2).padStart(2, '0')}`,
    weekday: ((index + 2) % 7 + 1) as 1, is_today: index === 0, is_trophy: false, protection: null,
    total_ml: index === 0 ? 500 : 0, goal_ml: 2000, percentage: index === 0 ? 25 : 0,
    state: index === 0 ? 'in_progress' : 'future',
  })),
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.useRealTimers(); jest.restoreAllMocks();});

test('moves from Sunday to Monday at midnight in the challenge timezone with the same cached response', async () => {
  jest.setSystemTime(new Date('2026-09-07T02:59:59Z'));
  const {result} = await renderHook(() => useChallengeCalendar(week));
  expect(result.current.days.filter(day => day.is_today).map(day => day.weekday)).toEqual([7]);

  await act(() => jest.advanceTimersByTime(1000));

  expect(result.current.current_date).toBe('2026-09-07');
  expect(result.current.days.filter(day => day.is_today).map(day => day.weekday)).toEqual([1]);
  expect(result.current.days[0]).toMatchObject({total_ml: 500, state: 'missed', is_today: false});
  expect(result.current.days[5]).toMatchObject({total_ml: 0, state: 'no_record', is_today: true});
});

test('updates immediately on foreground and never puts today on a finished challenge', async () => {
  let onState!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {onState = callback; return {remove};});
  jest.setSystemTime(new Date('2026-09-02T12:00:00Z'));
  const {result, unmount} = await renderHook(() => useChallengeCalendar(week));
  jest.setSystemTime(new Date('2026-09-09T12:00:00Z'));
  await act(() => onState('active'));
  expect(result.current.days.some(day => day.is_today)).toBe(false);
  expect(result.current.days.every(day => day.state === 'missed')).toBe(true);
  await unmount();
  expect(remove).toHaveBeenCalled();
});

test('uses the group timezone even when the device and cached current date differ', async () => {
  jest.setSystemTime(new Date('2026-09-02T23:30:00Z'));
  const {result} = await renderHook(() => useChallengeCalendar({...week, timezone: 'Asia/Tokyo'}));
  expect(result.current.days.filter(day => day.is_today).map(day => day.date)).toEqual(['2026-09-03']);
});
