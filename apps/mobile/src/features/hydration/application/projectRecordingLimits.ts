import type {HydrationRecordingLimits} from '@aqualino/contracts';
import type {PendingHydration} from '../data/outboxStore';

export function projectRecordingLimits(limits: HydrationRecordingLimits | undefined, pending: PendingHydration[], confirmedCount: number): HydrationRecordingLimits {
  const interval = limits?.minimum_interval_seconds ?? 900;
  const recorded = (limits?.recorded_today ?? confirmedCount) + pending.length;
  const next = Math.max(limits?.next_allowed_at ? Date.parse(limits.next_allowed_at) : 0,
    ...pending.map(event => Date.parse(event.occurredAt) + interval * 1000));
  return {
    daily_limit: limits?.daily_limit ?? 15,
    minimum_interval_seconds: interval,
    recorded_today: recorded,
    remaining_today: Math.max(0, (limits?.daily_limit ?? 15) - recorded),
    next_allowed_at: next > 0 ? new Date(next).toISOString() : null,
    server_now: limits?.server_now ?? pending.at(-1)?.occurredAt ?? new Date().toISOString(),
  };
}
