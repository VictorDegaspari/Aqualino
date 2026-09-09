import type {HydrationWeek, HydrationWeekDay} from '@aqualino/contracts';
import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import {hydrationLogDate} from './hydrationHistory';

export function advanceHydrationDay(home: HydrationHomeData, now: string): HydrationHomeData {
  const date = hydrationLogDate(new Date(now), home.today.timezone);
  const challenges = home.challenges ? {...home.challenges} : undefined;
  for (const mode of ['solo', 'group'] as const) {
    const challenge = challenges?.[mode];
    if (challenge && challenges) challenges[mode] = {...challenge, progress: advanceWeek(challenge.progress, now, home.today.goal_ml)};
  }
  if (date <= home.today.local_date) return {...home, challenges};
  const snapshotDate = hydrationLogDate(new Date(home.mascot.generated_at), home.today.timezone);
  const elapsedDays = (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${snapshotDate}T12:00:00Z`)) / 86_400_000;
  const lastLogDate = home.mascot.last_log_at ? hydrationLogDate(new Date(home.mascot.last_log_at), home.today.timezone) : null;
  const daysSinceLastLog = lastLogDate ? Math.max(0, (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${lastLogDate}T12:00:00Z`)) / 86_400_000) : null;
  return {
    ...home, challenges,
    today: {...home.today, local_date: date, total_ml: 0, log_count: 0, percentage: 0, goal_achieved: false,
      recording_limits: home.today.recording_limits ? {...home.today.recording_limits, recorded_today: 0, remaining_today: home.today.recording_limits.daily_limit} : undefined},
    week: advanceWeek(home.week, now, home.today.goal_ml),
    mascot: {...home.mascot, generated_at: now, today_total_ml: 0,
      current_streak: elapsedDays === 1 && home.mascot.today_total_ml >= 50 ? home.mascot.current_streak : 0,
      days_since_last_log: daysSinceLastLog,
      last_log_semantic_key: daysSinceLastLog === null ? 'no_history' : daysSinceLastLog === 0 ? 'today' : daysSinceLastLog === 1 ? 'yesterday' : 'days_ago'},
  };
}

function advanceWeek(week: HydrationWeek, now: string, goalMl: number): HydrationWeek {
  const date = hydrationLogDate(new Date(now), week.timezone);
  if (date <= week.current_date) return week;
  let days = week.days;
  if (week.mode === 'civil_week' && date > week.ends_on) {
    const monday = new Date(`${date}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    days = Array.from({length: 7}, (_, index) => {
      const day = new Date(monday);
      day.setUTCDate(day.getUTCDate() + index);
      return {date: day.toISOString().slice(0, 10), weekday: (index + 1) as HydrationWeekDay['weekday'], total_ml: 0, goal_ml: goalMl, percentage: 0,
        state: 'no_record' as const, is_today: false, is_trophy: index === 6, protection: null};
    });
  }
  days = days.map(day => ({...day, is_today: day.date === date,
    state: day.date > date ? 'future' : day.total_ml >= day.goal_ml ? 'goal_achieved' : day.date < date ? 'missed' : day.total_ml > 0 ? 'in_progress' : 'no_record'}));
  return {...week, current_date: date, starts_on: days[0]?.date ?? week.starts_on, ends_on: days.at(-1)?.date ?? week.ends_on,
    days, total_ml: days.reduce((total, day) => total + day.total_ml, 0), completed_goal_days: days.filter(day => day.state === 'goal_achieved').length};
}
