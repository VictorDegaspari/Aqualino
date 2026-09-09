import type {HydrationHomeData} from './hydrationRemoteRepository';
import type {HydrationClockReference} from '../application/trustedHydrationClock';

export interface PendingHydration {
  clientEventId: string;
  amountMl: number;
  occurredAt: string;
  source: 'mobile' | 'widget' | 'shortcut';
  attempts: number;
  photoBase64?: string;
}

export interface OutboxStore {
  initialize(): Promise<void>;
  enqueue(event: PendingHydration): Promise<void>;
  pending(includePhotos?: boolean): Promise<PendingHydration[]>;
  pendingCount(): Promise<number>;
  remove(clientEventId: string): Promise<void>;
  recordFailure(clientEventId: string, message: string): Promise<void>;
  saveHome(data: HydrationHomeData): Promise<void>;
  loadHome(): Promise<HydrationHomeData | null>;
  saveClock(reference: HydrationClockReference): Promise<void>;
  loadClock(): Promise<HydrationClockReference | null>;
}
