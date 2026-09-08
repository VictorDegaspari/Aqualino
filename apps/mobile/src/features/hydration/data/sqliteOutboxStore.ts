import {open, type NitroSQLiteConnection, type SQLiteValue} from 'react-native-nitro-sqlite';
import type {HydrationHomeData} from './hydrationRemoteRepository';
import type {OutboxStore, PendingHydration} from './outboxStore';

interface PendingRow {
  [key: string]: SQLiteValue;
  client_event_id: string;
  amount_ml: number;
  occurred_at: string;
  source: string;
  attempts: number;
  photo_base64: string | null;
}

interface CacheRow { [key: string]: SQLiteValue; value: string }

const DATABASE_NAME = 'aqualino.sqlite';
type GlobalWithOutboxDatabase = typeof globalThis & {
  __aqualinoOutboxDatabases__?: Record<string, NitroSQLiteConnection>;
};

function getSharedDatabase(name: string): NitroSQLiteConnection {
  const globalScope = globalThis as GlobalWithOutboxDatabase;
  globalScope.__aqualinoOutboxDatabases__ ??= {};
  globalScope.__aqualinoOutboxDatabases__[name] ??= open({name});
  return globalScope.__aqualinoOutboxDatabases__[name];
}

export class SQLiteOutboxStore implements OutboxStore {
  constructor(private readonly databaseName = DATABASE_NAME) {}
  private database?: NitroSQLiteConnection;
  private initialization?: Promise<void>;

  initialize(): Promise<void> {
    this.initialization ??= this.getDatabase().executeBatchAsync([
      {query: `CREATE TABLE IF NOT EXISTS hydration_outbox (
        client_event_id TEXT PRIMARY KEY NOT NULL,
        amount_ml INTEGER NOT NULL,
        occurred_at TEXT NOT NULL,
        source TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      )`},
      {query: `CREATE TABLE IF NOT EXISTS app_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`},
      {query: `CREATE TABLE IF NOT EXISTS hydration_outbox_photos (
        client_event_id TEXT PRIMARY KEY NOT NULL,
        photo_base64 TEXT NOT NULL
      )`},
    ]).then(() => undefined);

    return this.initialization;
  }

  async pendingCount(): Promise<number> {
    await this.initialize();
    const {rows} = await this.getDatabase().executeAsync<{[key: string]: SQLiteValue; count: number}>(
      'SELECT COUNT(*) AS count FROM hydration_outbox',
    );
    return rows.item(0)?.count ?? 0;
  }

  async enqueue(event: PendingHydration): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeBatchAsync([
      {query: `INSERT OR IGNORE INTO hydration_outbox
       (client_event_id, amount_ml, occurred_at, source, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      params: [event.clientEventId, event.amountMl, event.occurredAt, event.source, event.attempts, new Date().toISOString()]},
      ...(event.photoBase64 ? [{query: 'INSERT OR IGNORE INTO hydration_outbox_photos (client_event_id, photo_base64) VALUES (?, ?)', params: [event.clientEventId, event.photoBase64]}] : []),
    ]);
  }

  async pending(): Promise<PendingHydration[]> {
    await this.initialize();
    const {rows} = await this.getDatabase().executeAsync<PendingRow>(
      `SELECT o.client_event_id, o.amount_ml, o.occurred_at, o.source, o.attempts, p.photo_base64
       FROM hydration_outbox o LEFT JOIN hydration_outbox_photos p ON p.client_event_id = o.client_event_id
       ORDER BY o.created_at ASC LIMIT 100`,
    );

    return rows._array.map(row => ({
      clientEventId: row.client_event_id,
      amountMl: row.amount_ml,
      occurredAt: row.occurred_at,
      source: row.source as PendingHydration['source'],
      attempts: row.attempts,
      photoBase64: row.photo_base64 ?? undefined,
    }));
  }

  async remove(clientEventId: string): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeBatchAsync([
      {query: 'DELETE FROM hydration_outbox_photos WHERE client_event_id = ?', params: [clientEventId]},
      {query: 'DELETE FROM hydration_outbox WHERE client_event_id = ?', params: [clientEventId]},
    ]);
  }

  async recordFailure(clientEventId: string, message: string): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeAsync(
      'UPDATE hydration_outbox SET attempts = attempts + 1, last_error = ? WHERE client_event_id = ?',
      [message.slice(0, 500), clientEventId],
    );
  }

  async saveHome(data: HydrationHomeData): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeAsync(
      `INSERT INTO app_cache (cache_key, value, updated_at) VALUES ('hydration_confirmed_home_v2', ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(data), new Date().toISOString()],
    );
  }

  async loadHome(): Promise<HydrationHomeData | null> {
    await this.initialize();
    const {rows} = await this.getDatabase().executeAsync<CacheRow>(
      "SELECT value FROM app_cache WHERE cache_key = 'hydration_confirmed_home_v2' LIMIT 1",
    );
    const value = rows.item(0)?.value;
    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<HydrationHomeData>;

    return parsed.today && parsed.mascot && parsed.week?.days.length === 7
      ? parsed as HydrationHomeData
      : null;
  }

  private getDatabase(): NitroSQLiteConnection {
    this.database ??= getSharedDatabase(this.databaseName);
    return this.database;
  }
}
