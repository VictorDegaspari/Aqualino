import type {RecordWaterResult} from '@aqualino/contracts';
import type {HydrationHomeData, HydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import {OfflineHydrationService} from '../application/offlineHydrationService';
import {InMemoryOutboxStore} from './inMemoryOutboxStore';
import {AppError} from '../../../shared/errors/AppError';
import {mergeHydrationLogs} from '../application/hydrationHistory';
import {TrustedHydrationClock} from '../application/trustedHydrationClock';
import {advanceHydrationDay} from '../application/advanceHydrationDay';
import type {WidgetSnapshotWriter} from '../../widget/data/widgetBridge';

const result: RecordWaterResult = {
  log: {
    id: '01K4', amount_ml: 300, occurred_at: '2026-09-02T12:00:00Z', local_date: '2026-09-02',
    source: 'mobile', client_event_id: 'event',
  },
  idempotent_replay: false,
  today: {
    local_date: '2026-09-02', timezone: 'America/Sao_Paulo', total_ml: 300, goal_ml: 2000,
    percentage: 15, goal_achieved: false, log_count: 1,
  },
  gamification: {xp_awarded: 10, xp_total: 10, level: 1, streak: 1, new_achievements: []},
  mascot: {condition: 'happy', decoration: null, animation: 'idle_happy', static_asset: 'aqualino_happy'},
  widget: {
    schema_version: 3, frozen_dates: [], generated_at: '2026-09-02T12:00:00Z', user_timezone: 'America/Sao_Paulo',
    last_log_at: '2026-09-02T12:00:00Z', days_since_last_log: 0, last_log_semantic_key: 'today',
    current_streak: 1, today_total_ml: 300, daily_goal_ml: 2000, condition: 'happy', decoration: null,
    animation: 'idle_happy', static_asset: 'aqualino_happy',
  },
};

const homeData: HydrationHomeData = {
  today: {...result.today, total_ml: 0, percentage: 0, goal_achieved: false, log_count: 0},
  week: {
    mode: 'civil_week', starts_on: '2026-08-31', ends_on: '2026-09-06', current_date: '2026-09-02',
    timezone: 'America/Sao_Paulo', completed_goal_days: 0, total_ml: 0,
    days: [
      {date: '2026-08-31', weekday: 1, state: 'missed', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-01', weekday: 2, state: 'missed', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-02', weekday: 3, state: 'no_record', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: true, is_trophy: false, protection: null},
      {date: '2026-09-03', weekday: 4, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-04', weekday: 5, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-05', weekday: 6, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: false, protection: null},
      {date: '2026-09-06', weekday: 7, state: 'future', total_ml: 0, goal_ml: 2000, percentage: 0, is_today: false, is_trophy: true, protection: null},
    ],
  },
  mascot: {...result.widget, last_log_at: null},
};

test('keeps the same client event id from offline enqueue through retry', async () => {
  const store = new InMemoryOutboxStore();
  const record = jest.fn().mockResolvedValue(result);
  const remote: HydrationRemoteRepository = {
    getHome: jest.fn(), getLogs: jest.fn(), record, updateGoal: jest.fn(),
  };
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(store, remote, widget);

  const queued = await service.record(300, 'mobile', false);
  expect(queued.kind).toBe('queued');
  expect(await service.pendingCount()).toBe(1);

  const pendingId = (await store.pending())[0].clientEventId;
  expect(await service.flush()).toEqual({synced: 1, rejected: 0});
  expect(record).toHaveBeenCalledWith(expect.objectContaining({client_event_id: pendingId}));
  expect(await service.pendingCount()).toBe(0);
  expect(widget.write).toHaveBeenCalledWith(result.widget);
});

test('does not duplicate an event when synchronization is retried', async () => {
  const store = new InMemoryOutboxStore();
  const record = jest.fn()
    .mockRejectedValueOnce(new Error('temporária'))
    .mockResolvedValueOnce({...result, idempotent_replay: true});
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs: jest.fn(), record, updateGoal: jest.fn()},
    {write: jest.fn().mockResolvedValue(undefined)},
  );

  await service.record(300, 'widget', false);
  const id = (await store.pending())[0].clientEventId;
  await service.flush();
  expect(await service.pendingCount()).toBe(1);
  await service.flush();

  expect(record.mock.calls[0][0].client_event_id).toBe(id);
  expect(record.mock.calls[1][0].client_event_id).toBe(id);
  expect(await service.pendingCount()).toBe(0);
});

test('updates the current weekly step while a record waits offline', async () => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()},
    widget,
  );

  await service.record(300, 'mobile', false);

  const {data} = await service.cachedOrRemote();
  expect(store.home?.today.total_ml).toBe(0);
  expect(data.today.total_ml).toBe(300);
  expect(data.week.total_ml).toBe(300);
  expect(data.week.days[2].state).toBe('in_progress');
  expect(data.week.days[2].percentage).toBe(15);
  expect(data.mascot.current_streak).toBe(1);
  expect(widget.write).toHaveBeenCalledWith(expect.objectContaining({
    schema_version: 3,
    current_streak: 1,
    today_total_ml: 300,
  }));
});

test('refreshes the widget snapshot when Home data is loaded', async () => {
  const store = new InMemoryOutboxStore();
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(
    store,
    {getHome: jest.fn().mockResolvedValue(homeData), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()},
    widget,
  );

  await expect(service.cachedOrRemote()).resolves.toEqual({data: homeData, offline: false});
  expect(widget.write).toHaveBeenCalledWith(homeData.mascot);
});

test('migrates a legacy cached widget snapshot while offline', async () => {
  const store = new InMemoryOutboxStore();
  const legacyMascot = {...homeData.mascot} as unknown as Record<string, unknown>;
  legacyMascot.schema_version = 1;
  delete legacyMascot.current_streak;
  await store.saveHome({
    ...homeData,
    mascot: legacyMascot as unknown as HydrationHomeData['mascot'],
  });
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(
    store,
    {
      getHome: jest.fn().mockRejectedValue(new Error('offline')),
      getLogs: jest.fn(),
      record: jest.fn(),
      updateGoal: jest.fn(),
    },
    widget,
  );

  const response = await service.cachedOrRemote();

  expect(response.offline).toBe(true);
  expect(response.data.mascot.schema_version).toBe(3);
  expect(response.data.mascot.current_streak).toBe(1);
  expect(widget.write).toHaveBeenCalledWith(expect.objectContaining({
    schema_version: 3,
    current_streak: 1,
  }));
});

test('continues a frozen streak offline and preserves its marker through reconciliation', async () => {
  const store = new InMemoryOutboxStore();
  const protectedHome: HydrationHomeData = {...homeData,
    mascot: {...homeData.mascot, current_streak: 4, today_total_ml: 0, frozen_dates: ['2026-09-01'],
      last_log_at: '2026-08-31T12:00:00Z', days_since_last_log: 2, last_log_semantic_key: 'days_ago'},
    week: {...homeData.week, days: homeData.week.days.map(day => day.date === '2026-09-01' ? {...day, protection: 'streak_freeze'} : day)},
  };
  await store.saveHome(protectedHome);
  const reconciled = {...result, widget: {...result.widget, current_streak: 5, frozen_dates: ['2026-09-01']}};
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(store, {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn().mockResolvedValue(reconciled), updateGoal: jest.fn()}, widget);

  await service.record(300, 'mobile', false);
  const {data} = await service.cachedOrRemote(false);
  expect(data.mascot.current_streak).toBe(5);
  expect(data.week.days[1]).toMatchObject({protection: 'streak_freeze', total_ml: 0, state: 'missed'});
  expect(widget.write).toHaveBeenLastCalledWith(expect.objectContaining({current_streak: 5, frozen_dates: ['2026-09-01']}));

  await service.flush();
  expect(widget.write).toHaveBeenLastCalledWith(reconciled.widget);
});

test('migrates version 2 frozen dates from the cached week without inventing protection', async () => {
  const store = new InMemoryOutboxStore();
  const mascot = {...homeData.mascot} as unknown as Record<string, unknown>;
  mascot.schema_version = 2;
  delete mascot.frozen_dates;
  await store.saveHome({...homeData, mascot: mascot as unknown as HydrationHomeData['mascot'],
    week: {...homeData.week, days: homeData.week.days.map(day => day.date === '2026-09-01' ? {...day, protection: 'streak_freeze'} : day)},
  });
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = createService(store, {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()}, widget);

  const {data} = await service.cachedOrRemote(false);
  expect(data.mascot).toMatchObject({schema_version: 3, frozen_dates: ['2026-09-01']});
  expect(store.home?.mascot.frozen_dates).toEqual(['2026-09-01']);
  expect(widget.write).toHaveBeenLastCalledWith(data.mascot);
});

test('anchors yesterday water to the new day without moving the frozen marker', () => {
  const home = {...homeData, today: result.today,
    mascot: {...result.widget, current_streak: 5, frozen_dates: ['2026-09-01']}};
  const nextDay = advanceHydrationDay(home, '2026-09-03T03:00:00Z');
  expect(nextDay.mascot).toMatchObject({generated_at: '2026-09-03T03:00:00Z', today_total_ml: 0,
    current_streak: 5, last_log_semantic_key: 'yesterday', frozen_dates: ['2026-09-01']});

  const missedDay = advanceHydrationDay(home, '2026-09-04T03:00:00Z');
  expect(missedDay.mascot).toMatchObject({current_streak: 0, last_log_semantic_key: 'days_ago', frozen_dates: ['2026-09-01']});
});

test.each([
  new AppError('Sem conexão', 'NETWORK_UNAVAILABLE'),
  new AppError('Tempo esgotado', 'REQUEST_TIMEOUT'),
  new AppError('Servidor indisponível', 'HTTP_ERROR', 503),
  new AppError('Aguarde um instante', 'HTTP_ERROR', 429),
])('keeps a saved drink and updated drop when sending fails with %s', async error => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const record = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(result);
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs: jest.fn(), record, updateGoal: jest.fn()},
    {write: jest.fn().mockResolvedValue(undefined)},
  );

  await expect(service.record(300, 'mobile', true)).resolves.toMatchObject({kind: 'queued'});
  expect(record).not.toHaveBeenCalled();
  await service.flush();
  const {data} = await service.cachedOrRemote();
  expect(data.today.total_ml).toBe(300);
  expect(data.week.days[2].percentage).toBe(15);
  expect(await service.pendingCount()).toBe(1);
  const eventId = (await store.pending())[0].clientEventId;

  await service.flush();
  expect(record.mock.calls[1][0].client_event_id).toBe(eventId);
  expect(await service.pendingCount()).toBe(0);
  expect(store.home?.today.total_ml).toBe(300);
});

test('reports success after saving even if the widget refresh fails', async () => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn().mockResolvedValue(result), updateGoal: jest.fn()},
    {write: jest.fn().mockRejectedValue(new Error('Widget indisponível'))},
  );

  await expect(service.record(300, 'mobile', true)).resolves.toMatchObject({kind: 'queued'});
  await service.flush();
  expect(await service.pendingCount()).toBe(0);
  expect(store.home?.today.total_ml).toBe(300);
  expect(store.home?.week.days[2].percentage).toBe(15);
});

test('loads all pages so the history total includes every marking of the day', async () => {
  const earlier = {...result.log, id: 'earlier', client_event_id: 'earlier', amount_ml: 200, occurred_at: '2026-09-02T11:00:00Z'};
  const getLogs = jest.fn()
    .mockResolvedValueOnce({data: [result.log], meta: {current_page: 1, last_page: 2, per_page: 1, total: 2}})
    .mockResolvedValueOnce({data: [earlier], meta: {current_page: 2, last_page: 2, per_page: 1, total: 2}});
  const service = createService(
    new InMemoryOutboxStore(),
    {getHome: jest.fn(), getLogs, record: jest.fn(), updateGoal: jest.fn()},
    {write: jest.fn()},
  );

  const history = await service.logs('2026-09-02', 'America/Sao_Paulo');
  expect(getLogs.mock.calls).toEqual([['2026-09-02', 1], ['2026-09-02', 2]]);
  expect(history.data).toEqual([result.log, earlier]);
  expect(history.data.reduce((total, log) => total + log.amount_ml, 0)).toBe(500);
});

test('shows persisted pending markings offline on the correct local day', async () => {
  const store = new InMemoryOutboxStore();
  await store.enqueue({clientEventId: 'late', amountMl: 500, occurredAt: '2026-09-03T01:00:00Z', source: 'mobile', attempts: 0});
  await store.enqueue({clientEventId: 'next-day', amountMl: 200, occurredAt: '2026-09-03T04:00:00Z', source: 'widget', attempts: 0});
  const getLogs = jest.fn();
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs, record: jest.fn(), updateGoal: jest.fn()},
    {write: jest.fn()},
  );
  const cached = mergeHydrationLogs([result.log]);

  const history = await service.logs('2026-09-02', 'America/Sao_Paulo', cached, false);
  expect(getLogs).not.toHaveBeenCalled();
  expect(history.data.map(log => log.amount_ml)).toEqual([500, 300]);
  expect(history.data.map(log => log.local_date)).toEqual(['2026-09-02', '2026-09-02']);
  const nextDay = await service.logs('2026-09-03', 'America/Sao_Paulo', undefined, false);
  expect(nextDay.data.map(log => log.amount_ml)).toEqual([200]);
});

test('does not duplicate a queued marking already saved by the server after a timeout', async () => {
  const store = new InMemoryOutboxStore();
  await store.enqueue({clientEventId: 'event', amountMl: 300, occurredAt: result.log.occurred_at, source: 'mobile', attempts: 1});
  const getLogs = jest.fn().mockResolvedValue(mergeHydrationLogs([result.log]));
  const service = createService(
    store,
    {getHome: jest.fn(), getLogs, record: jest.fn().mockResolvedValue({...result, idempotent_replay: true}), updateGoal: jest.fn()},
    {write: jest.fn()},
  );

  expect((await service.logs('2026-09-02', 'America/Sao_Paulo')).data).toEqual([result.log]);
  await service.flush();
  expect(await service.pendingCount()).toBe(0);
  expect((await service.logs('2026-09-02', 'America/Sao_Paulo')).data).toEqual([result.log]);
});

test('preserves available history during a fetch failure and reports an error when nothing is available', async () => {
  const error = new AppError('Sem conexão', 'NETWORK_UNAVAILABLE');
  const service = createService(
    new InMemoryOutboxStore(),
    {getHome: jest.fn(), getLogs: jest.fn().mockRejectedValue(error), record: jest.fn(), updateGoal: jest.fn()},
    {write: jest.fn()},
  );
  await expect(service.logs('2026-09-02', 'America/Sao_Paulo', mergeHydrationLogs([result.log])))
    .resolves.toMatchObject({data: [result.log]});
  await expect(service.logs('2026-09-02', 'America/Sao_Paulo')).rejects.toBe(error);
});

test('rejects a future device clock before enqueue and does not send it on a later reconnect', async () => {
  const store = new InMemoryOutboxStore();
  let wall = Date.parse(homeData.mascot.generated_at);
  const clock = new TrustedHydrationClock(() => wall, () => 0);
  const remote = {getHome: jest.fn().mockResolvedValue(homeData), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()};
  const service = new OfflineHydrationService(store, remote, {write: jest.fn()}, clock);
  await service.cachedOrRemote();

  wall += 86400000;
  await expect(service.record(500, 'mobile', false)).rejects.toMatchObject({code: 'DEVICE_CLOCK_CHANGED'});
  await expect(service.record(500, 'mobile', true)).rejects.toMatchObject({code: 'DEVICE_CLOCK_CHANGED'});
  wall += 86400000;
  expect(await service.flush()).toEqual({synced: 0, rejected: 0});
  expect(remote.record).not.toHaveBeenCalled();
  expect(await store.pending()).toEqual([]);
  expect(store.home?.today.total_ml).toBe(0);
});

test('reconciles a timed-out marking before caching server totals or projecting offline progress', async () => {
  const store = new InMemoryOutboxStore();
  await store.enqueue({clientEventId: 'event', amountMl: 300, occurredAt: result.log.occurred_at, source: 'mobile', attempts: 1});
  const remote = {
    getHome: jest.fn().mockResolvedValueOnce({...homeData, today: result.today}).mockRejectedValue(new Error('offline')),
    getLogs: jest.fn().mockResolvedValue(mergeHydrationLogs([result.log])), record: jest.fn(), updateGoal: jest.fn(),
  };
  const service = createService(store, remote, {write: jest.fn()});
  expect((await service.cachedOrRemote()).data.today.total_ml).toBe(300);
  expect((await service.cachedOrRemote()).data.today.total_ml).toBe(300);
  expect(await service.pendingCount()).toBe(0);
});

test('requires server time after a cold start even when an old Home cache exists', async () => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const remote = {getHome: jest.fn().mockRejectedValue(new Error('offline')), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()};
  const service = new OfflineHydrationService(store, remote, {write: jest.fn()});
  await service.cachedOrRemote();

  await expect(service.record(300, 'mobile', false)).rejects.toMatchObject({code: 'HYDRATION_TIME_UNVERIFIED'});
  expect(await store.pending()).toEqual([]);
});

test('removes rejected progress from Home, widget and cached history even if the refresh fails', async () => {
  const store = new InMemoryOutboxStore();
  const emptyHome = {...homeData, mascot: {...homeData.mascot, current_streak: 0, today_total_ml: 0, last_log_at: null, last_log_semantic_key: 'no_history' as const}};
  await store.saveHome(emptyHome);
  const widget = {write: jest.fn()};
  const remote = {
    getHome: jest.fn().mockRejectedValue(new Error('offline')),
    getLogs: jest.fn().mockRejectedValue(new Error('offline')),
    record: jest.fn().mockRejectedValue(new AppError('O horário não pode estar no futuro.', 'VALIDATION_FAILED', 422)),
    updateGoal: jest.fn(),
  };
  const service = createService(store, remote, widget);
  await service.record(500, 'mobile', false);
  const history = await service.logs(homeData.today.local_date, homeData.today.timezone, undefined, false);
  expect((await service.cachedOrRemote()).data.today.total_ml).toBe(500);

  expect(await service.flush()).toEqual({synced: 0, rejected: 1});
  const {data} = await service.cachedOrRemote();
  expect(data.today.total_ml).toBe(0);
  expect(data.week.total_ml).toBe(0);
  expect(data.week.completed_goal_days).toBe(0);
  expect(data.mascot.current_streak).toBe(0);
  expect(widget.write).toHaveBeenLastCalledWith(emptyHome.mascot);
  expect((await service.logs(homeData.today.local_date, homeData.today.timezone, history, false)).data).toEqual([]);
  await service.flush();
  expect(remote.record).toHaveBeenCalledTimes(1);
});

test('keeps authorized offline events queued through an authentication failure', async () => {
  const store = new InMemoryOutboxStore();
  const remote = {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn().mockRejectedValue(new AppError('Entre novamente', 'UNAUTHENTICATED', 401)), updateGoal: jest.fn()};
  const service = createService(store, remote, {write: jest.fn()});
  await service.record(300, 'mobile', false);
  expect(await service.flush()).toEqual({synced: 0, rejected: 0});
  expect(await service.pendingCount()).toBe(1);
});

function createService(store: InMemoryOutboxStore, remote: HydrationRemoteRepository, widget: WidgetSnapshotWriter) {
  const clock = new TrustedHydrationClock(() => Date.parse(result.widget.generated_at), () => 0);
  clock.synchronize(result.widget.generated_at);
  return new OfflineHydrationService(store, remote, widget, clock);
}


test('retains photo bytes across offline retries and uploads them with the original event', async () => {
  const store = new InMemoryOutboxStore();
  const remote = {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn().mockRejectedValueOnce(new AppError('Offline', 'NETWORK_UNAVAILABLE')).mockResolvedValue(result), updateGoal: jest.fn()};
  const service = createService(store, remote, {write: jest.fn()});
  await service.record(300, 'mobile', false, 'photo-data');
  const original = (await store.pending())[0];
  expect(original.photoBase64).toBe('photo-data');
  await service.flush();
  expect((await store.pending())[0].photoBase64).toBe('photo-data');
  await service.flush();
  expect(remote.record).toHaveBeenLastCalledWith(expect.objectContaining({photo_base64: 'photo-data', client_event_id: original.clientEventId}));
  expect(await store.pending()).toEqual([]);
});

test('enforces the 15 minute interval offline and accepts the exact boundary', async () => {
  let elapsed = 0;
  const clock = new TrustedHydrationClock(() => Date.parse(result.widget.generated_at) + elapsed, () => elapsed);
  clock.synchronize(result.widget.generated_at);
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const service = new OfflineHydrationService(store, {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()}, {write: jest.fn()}, clock);
  await service.record(300, 'mobile', false);
  elapsed = 899_999;
  await expect(service.record(300, 'mobile', false)).rejects.toMatchObject({code: 'HYDRATION_COOLDOWN'});
  elapsed = 900_000;
  await service.record(300, 'mobile', false);
  expect(await service.pendingCount()).toBe(2);
  expect((await service.cachedOrRemote()).data.today.recording_limits).toMatchObject({recorded_today: 2, remaining_today: 13, next_allowed_at: '2026-09-02T12:30:00.000Z'});
});

test('counts invalid server records and queued records toward the daily limit', async () => {
  const store = new InMemoryOutboxStore();
  await store.saveHome({...homeData, today: {...homeData.today, recording_limits: {
    daily_limit: 15, minimum_interval_seconds: 900, recorded_today: 14, remaining_today: 1,
    next_allowed_at: null, server_now: result.widget.generated_at,
  }}});
  const service = createService(store, {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()}, {write: jest.fn()});
  await service.record(300, 'mobile', false);
  await expect(service.record(300, 'mobile', false)).rejects.toMatchObject({code: 'HYDRATION_DAILY_LIMIT'});
  expect(await service.pendingCount()).toBe(1);
});

test.each([true, false])('acknowledges the durable record without waiting for network or widget, connected=%s', async connected => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  const remote = {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(() => new Promise<RecordWaterResult>(() => {})), updateGoal: jest.fn()};
  const service = createService(store, remote, {write: jest.fn(() => new Promise<void>(() => {}))});
  const outcome = await service.record(300, 'mobile', connected, 'photo-data');
  expect(outcome.kind).toBe('queued');
  expect((await store.pending())[0]).toMatchObject({amountMl: 300, photoBase64: 'photo-data'});
  expect(remote.record).not.toHaveBeenCalled();
  expect(remote.getHome).not.toHaveBeenCalled();
});

test('reopens offline with saved clock and pending photo, without any network request', async () => {
  let wall = Date.parse(homeData.mascot.generated_at);
  const store = new InMemoryOutboxStore();
  const remote = {getHome: jest.fn().mockResolvedValue(homeData), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()};
  const first = new OfflineHydrationService(store, remote, {write: jest.fn()}, new TrustedHydrationClock(() => wall, () => 0));
  await first.cachedOrRemote();
  await first.record(300, 'mobile', false, 'original-photo');
  wall += 900000;
  remote.getHome.mockClear();
  const reopened = new OfflineHydrationService(store, remote, {write: jest.fn()}, new TrustedHydrationClock(() => wall, () => 0));
  expect((await reopened.cachedOrRemote(false)).data.today.total_ml).toBe(300);
  await reopened.record(200, 'mobile', false, 'second-photo');
  expect((await reopened.cachedOrRemote(false)).data.today.total_ml).toBe(500);
  expect((await store.pending()).map(event => event.photoBase64)).toEqual(['original-photo', 'second-photo']);
  expect(remote.getHome).not.toHaveBeenCalled();
  expect(remote.record).not.toHaveBeenCalled();
});

test('shares a single flush when connectivity and the queue trigger sync concurrently', async () => {
  const store = new InMemoryOutboxStore();
  let finish!: (value: RecordWaterResult) => void;
  const remote = {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(() => new Promise<RecordWaterResult>(resolve => {finish = resolve;})), updateGoal: jest.fn()};
  const service = createService(store, remote, {write: jest.fn()});
  await service.record(300, 'mobile', false);
  const first = service.flush();
  const second = service.flush();
  await Promise.resolve();
  expect(remote.record).toHaveBeenCalledTimes(1);
  finish(result);
  await expect(first).resolves.toEqual({synced: 1, rejected: 0});
  await expect(second).resolves.toEqual({synced: 1, rejected: 0});
  expect(await service.pendingCount()).toBe(0);
});

test('turns the local day offline and stops projecting yesterday into group points', async () => {
  let wall = Date.parse('2026-09-03T02:40:00Z');
  let elapsed = 0;
  const store = new InMemoryOutboxStore();
  const challenge = {id: 'group', mode: 'group' as const, status: 'active' as const, starts_at: '2026-09-02T03:00:00Z', ends_at: '2026-09-09T03:00:00Z', reward: null,
    progress: {...homeData.week, mode: 'challenge' as const}, participating: true};
  const cache = {...homeData, challenges: {solo: null, group: challenge, group_name: 'Amigos', can_start_group: false},
    mascot: {...homeData.mascot, generated_at: new Date(wall).toISOString()}};
  const clock = new TrustedHydrationClock(() => wall, () => elapsed);
  const remote = {getHome: jest.fn().mockResolvedValue(cache), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()};
  const service = new OfflineHydrationService(store, remote, {write: jest.fn()}, clock);
  await service.cachedOrRemote();
  await service.record(300, 'mobile', false);
  expect((await service.cachedOrRemote(false)).data.challenges?.group?.progress.total_ml).toBe(300);
  elapsed += 20 * 60000;
  wall += 20 * 60000;
  const next = await service.record(200, 'mobile', false);
  expect(next.kind === 'queued' && next.home?.today).toMatchObject({local_date: '2026-09-03', total_ml: 200, log_count: 1});
  const home = (await service.cachedOrRemote(false)).data;
  expect(home.challenges?.group?.progress.total_ml).toBe(200);
  expect(home.challenges?.group?.progress.days[2].total_ml).toBe(0);
  expect((await service.logs('2026-09-02', 'America/Sao_Paulo', undefined, false)).data[0].amount_ml).toBe(300);
  expect(await service.pendingCount()).toBe(2);
});

test('keeps the confirmed volume if an older Home request finishes after synchronization', async () => {
  const store = new InMemoryOutboxStore();
  await store.saveHome(homeData);
  let finishHome!: (data: HydrationHomeData) => void;
  const remote = {getHome: jest.fn(() => new Promise<HydrationHomeData>(resolve => {finishHome = resolve;})), getLogs: jest.fn(), record: jest.fn().mockResolvedValue(result), updateGoal: jest.fn()};
  const service = createService(store, remote, {write: jest.fn()});
  await service.record(300, 'mobile', false);
  const fetching = service.cachedOrRemote();
  await service.flush();
  finishHome(homeData);
  const fetched = await fetching;
  expect(fetched.data.today.total_ml).toBe(300);
  expect(fetched.offline).toBe(false);
  expect(store.home?.today.total_ml).toBe(300);
  expect(await service.pendingCount()).toBe(0);
});
