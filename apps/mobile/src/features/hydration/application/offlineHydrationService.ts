import type {HydrationChallenges, HydrationLogPage, RecordWaterResult, WidgetSnapshot} from '@aqualino/contracts';
import {AppError} from '../../../shared/errors/AppError';
import type {WidgetSnapshotWriter} from '../../widget/data/widgetBridge';
import type {HydrationHomeData, HydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import type {OutboxStore, PendingHydration} from '../data/outboxStore';
import {createUuid} from './createUuid';
import {updateHydrationWeek} from './updateHydrationWeek';
import {mergeHydrationLogs, pendingHydrationLog} from './hydrationHistory';
import {TrustedHydrationClock} from './trustedHydrationClock';
import {projectPendingChallenges} from './projectPendingChallenges';
import {projectRecordingLimits} from './projectRecordingLimits';
import {hydrationLogDate} from './hydrationHistory';

export type RecordOutcome =
  | {kind: 'synced'; result: RecordWaterResult}
  | {kind: 'queued'; event: PendingHydration};

export class OfflineHydrationService {
  private creating = false;
  constructor(
    private readonly store: OutboxStore,
    private readonly remote: HydrationRemoteRepository,
    private readonly widget: WidgetSnapshotWriter,
    private readonly clock: TrustedHydrationClock = new TrustedHydrationClock(),
  ) {}

  async cachedOrRemote(): Promise<{data: HydrationHomeData; offline: boolean}> {
    try {
      const data = await this.remote.getHome();
      this.clock.synchronize(data.mascot.generated_at);
      // A timed-out POST may already be included in these server totals.
      // Reconcile its id before projecting the remaining local events.
      const queued = await this.store.pending();
      const dates = new Set(queued.map(event => pendingHydrationLog(event, data.today.timezone).local_date));
      for (const date of dates) {
        const logs = await this.fetchRemoteLogs(date);
        const acceptedIds = new Set(logs.data.map(log => log.client_event_id));
        for (const event of queued) {
          if (acceptedIds.has(event.clientEventId)) await this.store.remove(event.clientEventId);
        }
      }
      await this.store.saveHome(data);
      const projected = await this.withPending(data);
      await this.writeWidgetSafely(projected.mascot);
      return {data: projected, offline: false};
    } catch (error) {
      if (error instanceof AppError && error.code === 'ACCOUNT_CHANGED') throw error;
      const cached = await this.store.loadHome();
      if (cached) {
        const migrated = {...cached, mascot: migrateWidgetSnapshot(cached.mascot)};
        await this.store.saveHome(migrated);
        const data = await this.withPending(migrated);
        await this.writeWidgetSafely(data.mascot);
        return {data, offline: true};
      }
      throw error;
    }
  }

  async record(
    amountMl: number,
    source: PendingHydration['source'],
    isConnected: boolean,
    photoBase64?: string,
  ): Promise<RecordOutcome> {
    if (this.creating) throw new AppError('Aguarde a marcação atual.', 'HYDRATION_RECORD_BUSY');
    this.creating = true;
    let event: PendingHydration;
    try {
      const occurredAt = await this.recordedAt(isConnected);
      await this.assertLocalLimits(occurredAt);
      event = {
        clientEventId: createUuid(),
        amountMl,
        occurredAt,
        source,
        attempts: 0,
        photoBase64,
      };
      await this.store.enqueue(event);
    } finally {
      this.creating = false;
    }
    await this.refreshCachedWidget();

    if (!isConnected) {
      return {kind: 'queued', event};
    }

    try {
      return await this.syncOne(event);
    } catch (error) {
      if (error instanceof AppError && (
        error.code === 'NETWORK_UNAVAILABLE' || error.code === 'REQUEST_TIMEOUT' ||
        (error.status !== undefined && error.status >= 500) || error.status === 429
      )) {
        return {kind: 'queued', event};
      }
      throw error;
    }
  }

  async logs(localDate: string, timezone: string, cached?: HydrationLogPage, isConnected = true): Promise<HydrationLogPage> {
    let remoteLogs: HydrationLogPage | undefined;
    let fetchError: unknown;
    try {
      if (!isConnected) throw new AppError('Sem conexão', 'NETWORK_UNAVAILABLE');
      remoteLogs = await this.fetchRemoteLogs(localDate);
    } catch (error) {
      if (error instanceof AppError && error.code === 'ACCOUNT_CHANGED') throw error;
      fetchError = error;
    }

    const pending = (await this.store.pending())
      .map(event => pendingHydrationLog(event, timezone))
      .filter(log => log.local_date === localDate);
    if (!remoteLogs && !cached && pending.length === 0) throw fetchError;

    // Server records replace matching queued events after a timeout or retry.
    const pendingIds = new Set(pending.map(log => log.client_event_id));
    const confirmedCache = cached?.data.filter(log => log.id !== log.client_event_id || pendingIds.has(log.client_event_id));
    return mergeHydrationLogs(pending, remoteLogs?.data ?? confirmedCache ?? []);
  }

  async flush(): Promise<{synced: number; rejected: number}> {
    const counts = {synced: 0, rejected: 0};
    for (const event of await this.store.pending()) {
      try {
        await this.syncOne(event);
        counts.synced++;
      } catch (error) {
        if (isPermanentRejection(error)) counts.rejected++;
        if (error instanceof AppError && ['NETWORK_UNAVAILABLE', 'ACCOUNT_CHANGED'].includes(error.code)) {
          break;
        }
      }
    }
    return counts;
  }

  async pendingCount(): Promise<number> {
    return (await this.store.pending()).length;
  }

  async rememberChallenges(challenges: HydrationChallenges): Promise<void> {
    const cached = await this.store.loadHome();
    if (cached) await this.store.saveHome({...cached, challenges});
  }

  private async fetchRemoteLogs(localDate: string): Promise<HydrationLogPage> {
    const firstPage = await this.remote.getLogs(localDate, 1);
    const pages = [firstPage.data];
    for (let page = 2; page <= firstPage.meta.last_page; page++) {
      pages.push((await this.remote.getLogs(localDate, page)).data);
    }
    return mergeHydrationLogs(...pages);
  }

  private async syncOne(event: PendingHydration): Promise<RecordOutcome> {
    try {
      const result = await this.remote.record({
        amount_ml: event.amountMl,
        occurred_at: event.occurredAt,
        source: event.source,
        client_event_id: event.clientEventId,
        ...(event.photoBase64 ? {photo_base64: event.photoBase64} : {}),
      });
      this.clock.synchronize(result.widget.generated_at);
      await this.store.remove(event.clientEventId);
      const cached = await this.store.loadHome();
      if (cached) {
        await this.store.saveHome({
          ...cached,
          challenges: result.challenges ?? cached.challenges,
          today: result.today,
          week: updateHydrationWeek(cached.week, result.today),
          mascot: result.widget,
        });
      }
      await this.writeWidgetSafely(result.widget);
      return {kind: 'synced', result};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      await this.store.recordFailure(event.clientEventId, message);
      if (isPermanentRejection(error)) {
        await this.store.remove(event.clientEventId);
        await this.refreshCachedWidget();
      }
      throw error;
    }
  }

  private async recordedAt(isConnected: boolean): Promise<string> {
    try {
      return this.clock.recordedAt();
    } catch (error) {
      if (!isConnected) throw error;
      const data = await this.remote.getHome();
      this.clock.synchronize(data.mascot.generated_at);
      await this.store.saveHome(data);
      return this.clock.recordedAt();
    }
  }

  private async assertLocalLimits(occurredAt: string): Promise<void> {
    const cached = await this.store.loadHome();
    const pending = await this.store.pending();
    const timestamp = Date.parse(occurredAt);
    const timezone = cached?.today.timezone ?? 'UTC';
    const date = hydrationLogDate(new Date(timestamp), timezone);
    const limits = cached?.today.recording_limits;
    const sameDay = date === cached?.today.local_date;
    const confirmed = sameDay ? limits?.recorded_today ?? cached?.today.log_count ?? 0 : 0;
    const queuedToday = pending.filter(event => hydrationLogDate(new Date(event.occurredAt), timezone) === date).length;
    if (confirmed + queuedToday >= (limits?.daily_limit ?? 15)) {
      throw new AppError('Você atingiu o limite de 15 marcações neste dia. Novos registros estarão disponíveis no próximo dia.', 'HYDRATION_DAILY_LIMIT');
    }
    const lastConfirmed = cached?.mascot.last_log_at;
    const next = limits?.next_allowed_at ? Date.parse(limits.next_allowed_at) : lastConfirmed ? Date.parse(lastConfirmed) + 900_000 : 0;
    if (timestamp < next || pending.some(event => Math.abs(Date.parse(event.occurredAt) - timestamp) < 900_000)) {
      throw new AppError('Aguarde 15 minutos entre marcações de água.', 'HYDRATION_COOLDOWN');
    }
  }

  private async refreshCachedWidget(): Promise<void> {
    const cached = await this.store.loadHome();
    if (cached) await this.writeWidgetSafely((await this.withPending(cached)).mascot);
  }

  // Persist only server-confirmed totals. Removing a rejected event then also
  // removes its optimistic progress, including when the next fetch is offline.
  private async withPending(cached: HydrationHomeData): Promise<HydrationHomeData> {
    const queued = await this.store.pending();
    const pending = queued.filter(event =>
      pendingHydrationLog(event, cached.today.timezone).local_date === cached.today.local_date);
    if (pending.length === 0) return cached.challenges ? {...cached, challenges: projectPendingChallenges(cached.challenges, queued)} : cached;
    const cachedMascot = migrateWidgetSnapshot(cached.mascot);
    const total = cached.today.total_ml + pending.reduce((sum, event) => sum + event.amountMl, 0);
    const today = {
      ...cached.today,
      total_ml: total,
      log_count: cached.today.log_count + pending.length,
      recording_limits: projectRecordingLimits(cached.today.recording_limits, pending, cached.today.log_count),
      percentage: Math.round((total / Math.max(cached.today.goal_ml, 1)) * 100),
      goal_achieved: total >= cached.today.goal_ml,
    };
    return {
      ...cached,
      challenges: projectPendingChallenges(cached.challenges, queued),
      today,
      week: updateHydrationWeek(cached.week, today),
      mascot: {
        ...cachedMascot,
        schema_version: 2,
        last_log_at: pending.reduce((latest, event) => event.occurredAt > latest ? event.occurredAt : latest, cachedMascot.last_log_at ?? ''),
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
  }

  private async writeWidgetSafely(snapshot: HydrationHomeData['mascot']): Promise<void> {
    try {
      await this.widget.write(snapshot);
    } catch {
      // A widget refresh must never block hydration or the cached Home response.
    }
  }
}

function isPermanentRejection(error: unknown): boolean {
  return error instanceof AppError && error.status !== undefined &&
    error.status >= 400 && error.status < 500 && ![401, 403, 408, 429].includes(error.status);
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
