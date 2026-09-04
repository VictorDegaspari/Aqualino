import type {RecordWaterResult} from '@aqualino/contracts';
import type {HydrationHomeData, HydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import {OfflineHydrationService} from '../application/offlineHydrationService';
import {InMemoryOutboxStore} from './inMemoryOutboxStore';

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
    schema_version: 2, generated_at: '2026-09-02T12:00:00Z', user_timezone: 'America/Sao_Paulo',
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
  mascot: result.widget,
};

test('keeps the same client event id from offline enqueue through retry', async () => {
  const store = new InMemoryOutboxStore();
  const record = jest.fn().mockResolvedValue(result);
  const remote: HydrationRemoteRepository = {
    getHome: jest.fn(), getLogs: jest.fn(), record, updateGoal: jest.fn(),
  };
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = new OfflineHydrationService(store, remote, widget);

  const queued = await service.record(300, 'mobile', false);
  expect(queued.kind).toBe('queued');
  expect(await service.pendingCount()).toBe(1);

  const pendingId = (await store.pending())[0].clientEventId;
  expect(await service.flush()).toBe(1);
  expect(record).toHaveBeenCalledWith(expect.objectContaining({client_event_id: pendingId}));
  expect(await service.pendingCount()).toBe(0);
  expect(widget.write).toHaveBeenCalledWith(result.widget);
});

test('does not duplicate an event when synchronization is retried', async () => {
  const store = new InMemoryOutboxStore();
  const record = jest.fn()
    .mockRejectedValueOnce(new Error('temporária'))
    .mockResolvedValueOnce({...result, idempotent_replay: true});
  const service = new OfflineHydrationService(
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
  const service = new OfflineHydrationService(
    store,
    {getHome: jest.fn(), getLogs: jest.fn(), record: jest.fn(), updateGoal: jest.fn()},
    widget,
  );

  await service.record(300, 'mobile', false);

  expect(store.home?.today.total_ml).toBe(300);
  expect(store.home?.week.total_ml).toBe(300);
  expect(store.home?.week.days[2].state).toBe('in_progress');
  expect(store.home?.week.days[2].percentage).toBe(15);
  expect(store.home?.mascot.current_streak).toBe(1);
  expect(widget.write).toHaveBeenCalledWith(expect.objectContaining({
    schema_version: 2,
    current_streak: 1,
    today_total_ml: 300,
  }));
});

test('refreshes the widget snapshot when Home data is loaded', async () => {
  const store = new InMemoryOutboxStore();
  const widget = {write: jest.fn().mockResolvedValue(undefined)};
  const service = new OfflineHydrationService(
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
  const service = new OfflineHydrationService(
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
  expect(response.data.mascot.schema_version).toBe(2);
  expect(response.data.mascot.current_streak).toBe(1);
  expect(widget.write).toHaveBeenCalledWith(expect.objectContaining({
    schema_version: 2,
    current_streak: 1,
  }));
});
