import type {HydrationHomeData} from './hydrationRemoteRepository';

export interface PendingHydration {
  clientEventId: string;
  amountMl: number;
  occurredAt: string;
  source: 'mobile' | 'widget' | 'shortcut';
  attempts: number;
}

export interface OutboxStore {
  initialize(): Promise<void>;
  enqueue(event: PendingHydration): Promise<void>;
  pending(): Promise<PendingHydration[]>;
  remove(clientEventId: string): Promise<void>;
  recordFailure(clientEventId: string, message: string): Promise<void>;
  saveHome(data: HydrationHomeData): Promise<void>;
  loadHome(): Promise<HydrationHomeData | null>;
}

