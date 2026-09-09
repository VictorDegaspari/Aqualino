import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import type {OutboxStore, PendingHydration} from '../data/outboxStore';
import type {HydrationClockReference} from '../application/trustedHydrationClock';

export class InMemoryOutboxStore implements OutboxStore {
  events = new Map<string, PendingHydration>();
  home: HydrationHomeData | null = null;
  clock: HydrationClockReference | null = null;

  async initialize(): Promise<void> {}
  async enqueue(event: PendingHydration): Promise<void> { this.events.set(event.clientEventId, event); }
  async pending(): Promise<PendingHydration[]> { return [...this.events.values()]; }
  async pendingCount(): Promise<number> { return this.events.size; }
  async remove(clientEventId: string): Promise<void> { this.events.delete(clientEventId); }
  async recordFailure(clientEventId: string): Promise<void> {
    const event = this.events.get(clientEventId);
    if (event) { event.attempts++; }
  }
  async saveHome(data: HydrationHomeData): Promise<void> { this.home = data; }
  async loadHome(): Promise<HydrationHomeData | null> { return this.home; }
  async saveClock(reference: HydrationClockReference): Promise<void> { this.clock = reference; }
  async loadClock(): Promise<HydrationClockReference | null> { return this.clock; }
}
