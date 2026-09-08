import type {HydrationWeek} from '@aqualino/contracts';
import {useEffect, useMemo, useState} from 'react';
import {AppState} from 'react-native';
import {hydrationLogDate} from '../../../hydration/application/hydrationHistory';

export function useChallengeCalendar(week: HydrationWeek): HydrationWeek {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      setNow(Date.now());
      timer = setTimeout(update, 60_000 - Date.now() % 60_000);
    };
    update();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    return () => {clearTimeout(timer); subscription.remove();};
  }, []);

  const date = hydrationLogDate(new Date(now), week.timezone);
  return useMemo(() => ({
    ...week,
    current_date: date,
    days: week.days.map(day => ({
      ...day,
      is_today: day.date === date,
      state: day.date > date ? 'future'
        : day.total_ml >= day.goal_ml ? 'goal_achieved'
          : day.date < date ? 'missed'
            : day.total_ml > 0 ? 'in_progress' : 'no_record',
    })),
  }), [date, week]);
}
