import {open, type NitroSQLiteConnection} from 'react-native-nitro-sqlite';
import {SQLiteOutboxStore} from '../data/sqliteOutboxStore';

jest.mock('react-native-nitro-sqlite', () => ({open: jest.fn()}));

const mockOpen = open as jest.MockedFunction<typeof open>;
const database = {
  executeBatchAsync: jest.fn(),
} as unknown as NitroSQLiteConnection;

beforeEach(() => {
  jest.clearAllMocks();
  delete (globalThis as typeof globalThis & {__aqualinoOutboxDatabases__?: Record<string, NitroSQLiteConnection>})
    .__aqualinoOutboxDatabases__;
  mockOpen.mockReturnValue(database);
  database.executeBatchAsync = jest.fn().mockResolvedValue({});
});

test('reuses the native database connection across outbox store instances', async () => {
  const firstStore = new SQLiteOutboxStore();
  const secondStore = new SQLiteOutboxStore();

  await Promise.all([firstStore.initialize(), secondStore.initialize()]);

  expect(mockOpen).toHaveBeenCalledTimes(1);
  expect(mockOpen).toHaveBeenCalledWith({name: 'aqualino.sqlite'});
});


test('opens separate databases for different accounts', async () => {
  await new SQLiteOutboxStore('aqualino-ana.sqlite').initialize();
  await new SQLiteOutboxStore('aqualino-bia.sqlite').initialize();
  expect(mockOpen.mock.calls).toEqual([[{name: 'aqualino-ana.sqlite'}], [{name: 'aqualino-bia.sqlite'}]]);
});

test('saves and removes photo bytes in the same transaction as their event', async () => {
  const store = new SQLiteOutboxStore();
  await store.enqueue({clientEventId: 'event', amountMl: 300, occurredAt: '2026-09-07T12:00:00Z', source: 'mobile', attempts: 0, photoBase64: 'photo-data'});
  expect(database.executeBatchAsync).toHaveBeenLastCalledWith([
    expect.objectContaining({params: ['event', 300, '2026-09-07T12:00:00Z', 'mobile', 0, expect.any(String)]}),
    expect.objectContaining({params: ['event', 'photo-data']}),
  ]);
  await store.remove('event');
  expect(database.executeBatchAsync).toHaveBeenLastCalledWith([
    {query: 'DELETE FROM hydration_outbox_photos WHERE client_event_id = ?', params: ['event']},
    {query: 'DELETE FROM hydration_outbox WHERE client_event_id = ?', params: ['event']},
  ]);
});
