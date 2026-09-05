import type {HydrationChallenges} from '@aqualino/contracts';
import type {PendingHydration} from '../data/outboxStore';
import {hydrationLogDate} from './hydrationHistory';
import {updateHydrationWeek} from './updateHydrationWeek';

export function projectPendingChallenges(challenges: HydrationChallenges | undefined, events: PendingHydration[]): HydrationChallenges | undefined {
  if (!challenges) return undefined;
  const projected = {...challenges};
  for (const mode of ['solo', 'group'] as const) {
    const challenge = challenges[mode];
    if (!challenge || challenge.status !== 'active') continue;
    let progress = challenge.progress;
    for (const event of events) {
      const date = hydrationLogDate(new Date(event.occurredAt), progress.timezone);
      const day = progress.days.find(candidate => candidate.date === date);
      if (!day || date > progress.current_date) continue;
      const total = day.total_ml + event.amountMl;
      progress = updateHydrationWeek(progress, {
        local_date: date, timezone: progress.timezone, total_ml: total, goal_ml: day.goal_ml,
        percentage: total / Math.max(1, day.goal_ml) * 100, goal_achieved: total >= day.goal_ml, log_count: 0,
      });
    }
    // The server alone unlocks and draws the reward after confirming the logs.
    projected[mode] = {...challenge, progress};
  }
  return projected;
}
