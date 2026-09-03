import type {HydrationToday, HydrationWeek} from '@aqualino/contracts';

export function updateHydrationWeek(week: HydrationWeek, today: HydrationToday): HydrationWeek {
  const days = week.days.map(day => {
    if (day.date !== today.local_date) {
      return day;
    }

    return {
      ...day,
      total_ml: today.total_ml,
      goal_ml: today.goal_ml,
      percentage: Math.min(100, Math.max(0, today.percentage)),
      state: today.goal_achieved
        ? 'goal_achieved' as const
        : today.total_ml > 0
          ? 'in_progress' as const
          : 'no_record' as const,
    };
  });

  return {
    ...week,
    completed_goal_days: days.filter(day => day.state === 'goal_achieved').length,
    total_ml: days.reduce((total, day) => total + day.total_ml, 0),
    days,
  };
}
