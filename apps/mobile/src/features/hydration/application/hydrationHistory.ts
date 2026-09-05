import type {HydrationLog, HydrationLogPage} from '@aqualino/contracts';
import type {PendingHydration} from '../data/outboxStore';

export const hydrationLogsKey = ['hydration', 'logs'] as const;

export function hydrationLogDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function pendingHydrationLog(event: PendingHydration, timezone: string): HydrationLog {
  return {
    id: event.clientEventId,
    client_event_id: event.clientEventId,
    amount_ml: event.amountMl,
    occurred_at: event.occurredAt,
    local_date: hydrationLogDate(new Date(event.occurredAt), timezone),
    source: event.source,
  };
}

export function mergeHydrationLogs(...groups: HydrationLog[][]): HydrationLogPage {
  const logs = new Map<string, HydrationLog>();
  for (const log of groups.flat()) logs.set(log.client_event_id || log.id, log);
  const data = [...logs.values()].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  return {data, meta: {current_page: 1, last_page: 1, per_page: data.length, total: data.length}};
}
