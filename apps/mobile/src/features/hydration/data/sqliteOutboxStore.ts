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
}

interface CacheRow { [key: string]: SQLiteValue; value: string }

export class SQLiteOutboxStore implements OutboxStore {
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
    ]).then(() => undefined);

    return this.initialization;
  }

  async enqueue(event: PendingHydration): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeAsync(
      `INSERT OR IGNORE INTO hydration_outbox
       (client_event_id, amount_ml, occurred_at, source, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event.clientEventId, event.amountMl, event.occurredAt, event.source, event.attempts, new Date().toISOString()],
    );
  }

  async pending(): Promise<PendingHydration[]> {
    await this.initialize();
    const {rows} = await this.getDatabase().executeAsync<PendingRow>(
      `SELECT client_event_id, amount_ml, occurred_at, source, attempts
       FROM hydration_outbox ORDER BY created_at ASC LIMIT 100`,
    );

    return rows._array.map(row => ({
      clientEventId: row.client_event_id,
      amountMl: row.amount_ml,
      occurredAt: row.occurred_at,
      source: row.source as PendingHydration['source'],
      attempts: row.attempts,
    }));
  }

  async remove(clientEventId: string): Promise<void> {
    await this.initialize();
    await this.getDatabase().executeAsync('DELETE FROM hydration_outbox WHERE client_event_id = ?', [clientEventId]);
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
      `INSERT INTO app_cache (cache_key, value, updated_at) VALUES ('hydration_home', ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(data), new Date().toISOString()],
    );
  }

  async loadHome(): Promise<HydrationHomeData | null> {
    await this.initialize();
    const {rows} = await this.getDatabase().executeAsync<CacheRow>(
      "SELECT value FROM app_cache WHERE cache_key = 'hydration_home' LIMIT 1",
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
    this.database ??= open({name: 'aqualino.sqlite'});
    return this.database;
  }
}
