import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import type {OutboxStore, PendingHydration} from '../data/outboxStore';

export class InMemoryOutboxStore implements OutboxStore {
  events = new Map<string, PendingHydration>();
  home: HydrationHomeData | null = null;

  async initialize(): Promise<void> {}
  async enqueue(event: PendingHydration): Promise<void> { this.events.set(event.clientEventId, event); }
  async pending(): Promise<PendingHydration[]> { return [...this.events.values()]; }
  async remove(clientEventId: string): Promise<void> { this.events.delete(clientEventId); }
  async recordFailure(clientEventId: string): Promise<void> {
    const event = this.events.get(clientEventId);
    if (event) { event.attempts++; }
  }
  async saveHome(data: HydrationHomeData): Promise<void> { this.home = data; }
  async loadHome(): Promise<HydrationHomeData | null> { return this.home; }
}

