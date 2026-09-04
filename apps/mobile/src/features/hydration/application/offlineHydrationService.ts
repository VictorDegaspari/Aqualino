import type {RecordWaterResult, WidgetSnapshot} from '@aqualino/contracts';
import {AppError} from '../../../shared/errors/AppError';
import type {WidgetSnapshotWriter} from '../../widget/data/widgetBridge';
import type {HydrationHomeData, HydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import type {OutboxStore, PendingHydration} from '../data/outboxStore';
import {createUuid} from './createUuid';
import {updateHydrationWeek} from './updateHydrationWeek';

export type RecordOutcome =
  | {kind: 'synced'; result: RecordWaterResult}
  | {kind: 'queued'; event: PendingHydration};

export class OfflineHydrationService {
  constructor(
    private readonly store: OutboxStore,
    private readonly remote: HydrationRemoteRepository,
    private readonly widget: WidgetSnapshotWriter,
  ) {}

  async cachedOrRemote(): Promise<{data: HydrationHomeData; offline: boolean}> {
    try {
      const data = await this.remote.getHome();
      await this.store.saveHome(data);
      await this.writeWidgetSafely(data.mascot);
      return {data, offline: false};
    } catch (error) {
      const cached = await this.store.loadHome();
      if (cached) {
        const migrated = {...cached, mascot: migrateWidgetSnapshot(cached.mascot)};
        await this.store.saveHome(migrated);
        await this.writeWidgetSafely(migrated.mascot);
        return {data: migrated, offline: true};
      }
      throw error;
    }
  }

  async record(
    amountMl: number,
    source: PendingHydration['source'],
    isConnected: boolean,
  ): Promise<RecordOutcome> {
    const event: PendingHydration = {
      clientEventId: createUuid(),
      amountMl,
      occurredAt: new Date().toISOString(),
      source,
      attempts: 0,
    };
    await this.store.enqueue(event);
    await this.updateCachedTotal(amountMl);

    if (!isConnected) {
      return {kind: 'queued', event};
    }

    return this.syncOne(event);
  }

  async flush(): Promise<number> {
    let synced = 0;
    for (const event of await this.store.pending()) {
      try {
        await this.syncOne(event);
        synced++;
      } catch (error) {
        if (error instanceof AppError && error.code === 'NETWORK_UNAVAILABLE') {
          break;
        }
      }
    }
    return synced;
  }

  async pendingCount(): Promise<number> {
    return (await this.store.pending()).length;
  }

  private async syncOne(event: PendingHydration): Promise<RecordOutcome> {
    try {
      const result = await this.remote.record({
        amount_ml: event.amountMl,
        occurred_at: event.occurredAt,
        source: event.source,
        client_event_id: event.clientEventId,
      });
      await this.store.remove(event.clientEventId);
      const cached = await this.store.loadHome();
      if (cached) {
        await this.store.saveHome({
          today: result.today,
          week: updateHydrationWeek(cached.week, result.today),
          mascot: result.widget,
        });
      }
      await this.widget.write(result.widget);
      return {kind: 'synced', result};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      await this.store.recordFailure(event.clientEventId, message);
      if (error instanceof AppError && error.status && error.status >= 400 && error.status < 500) {
        await this.store.remove(event.clientEventId);
      }
      throw error;
    }
  }

  private async updateCachedTotal(amountMl: number): Promise<void> {
    const cached = await this.store.loadHome();
    if (!cached) {
      return;
    }
    const cachedMascot = migrateWidgetSnapshot(cached.mascot);
    const total = cached.today.total_ml + amountMl;
    const today = {
      ...cached.today,
      total_ml: total,
      log_count: cached.today.log_count + 1,
      percentage: Math.round((total / Math.max(cached.today.goal_ml, 1)) * 100),
      goal_achieved: total >= cached.today.goal_ml,
    };
    const optimisticHome: HydrationHomeData = {
      today,
      week: updateHydrationWeek(cached.week, today),
      mascot: {
        ...cachedMascot,
        schema_version: 2,
        generated_at: new Date().toISOString(),
        last_log_at: new Date().toISOString(),
        days_since_last_log: 0,
        last_log_semantic_key: 'today',
        current_streak: cached.today.total_ml >= 50
          ? cachedMascot.current_streak
          : cachedMascot.last_log_semantic_key === 'yesterday'
            ? cachedMascot.current_streak + 1
            : 1,
        today_total_ml: total,
        condition: 'happy',
        static_asset: 'aqualino_happy',
      },
    };
    await this.store.saveHome(optimisticHome);
    await this.writeWidgetSafely(optimisticHome.mascot);
  }

  private async writeWidgetSafely(snapshot: HydrationHomeData['mascot']): Promise<void> {
    try {
      await this.widget.write(snapshot);
    } catch {
      // A widget refresh must never block hydration or the cached Home response.
    }
  }
}

function migrateWidgetSnapshot(snapshot: WidgetSnapshot): WidgetSnapshot {
  const legacyStreak = (snapshot as WidgetSnapshot & {current_streak?: unknown}).current_streak;
  const currentStreak = typeof legacyStreak === 'number' && Number.isFinite(legacyStreak)
    ? Math.max(0, Math.floor(legacyStreak))
    : snapshot.days_since_last_log === 0
      ? 1
      : 0;

  return {...snapshot, schema_version: 2, current_streak: currentStreak};
}
