import {open, type NitroSQLiteConnection} from 'react-native-nitro-sqlite';
import {SQLiteOutboxStore} from '../data/sqliteOutboxStore';

jest.mock('react-native-nitro-sqlite', () => ({open: jest.fn()}));

const mockOpen = open as jest.MockedFunction<typeof open>;
const database = {
  executeBatchAsync: jest.fn(),
} as unknown as NitroSQLiteConnection;

beforeEach(() => {
  jest.clearAllMocks();
  delete (globalThis as typeof globalThis & {__aqualinoOutboxDatabase__?: NitroSQLiteConnection})
    .__aqualinoOutboxDatabase__;
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
