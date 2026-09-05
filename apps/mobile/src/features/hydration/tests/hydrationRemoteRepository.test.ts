import {hydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import {OfflineHydrationService} from '../application/offlineHydrationService';
import {InMemoryOutboxStore} from './inMemoryOutboxStore';

jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => null}}));

afterEach(() => jest.restoreAllMocks());

test('preserves the API pagination envelope and includes later pages in history', async () => {
  const log = {id: 'first', client_event_id: 'first', amount_ml: 300, local_date: '2026-09-05', occurred_at: '2026-09-05T13:00:00Z', source: 'mobile'};
  const fetchMock = jest.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({ok: true, json: async () => ({data: [log], meta: {current_page: 1, last_page: 2, per_page: 1, total: 2}})} as Response)
    .mockResolvedValueOnce({ok: true, json: async () => ({data: [{...log, id: 'second', client_event_id: 'second', amount_ml: 500}], meta: {current_page: 2, last_page: 2, per_page: 1, total: 2}})} as Response);
  const service = new OfflineHydrationService(new InMemoryOutboxStore(), hydrationRemoteRepository, {write: jest.fn()});

  const history = await service.logs('2026-09-05', 'America/Sao_Paulo');
  expect(history.data.map(item => item.amount_ml)).toEqual([300, 500]);
  expect(history.meta.total).toBe(2);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    expect.stringContaining('local_date=2026-09-05&page=1&per_page=100'),
    expect.stringContaining('local_date=2026-09-05&page=2&per_page=100'),
  ]);
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('unwrapData');
});

test('keeps unwrapping the Home response', async () => {
  const data = {today: {total_ml: 800}, week: {}, mascot: {}};
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, json: async () => ({data})} as Response);
  await expect(hydrationRemoteRepository.getHome()).resolves.toEqual(data);
});
