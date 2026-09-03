import type {Inventory, PotionActionResult, UseStreakPotionInput} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export interface InventoryRemoteRepository {
  getInventory(): Promise<Inventory>;
  activateHydrationFreeze(input: UseStreakPotionInput): Promise<PotionActionResult>;
  releaseHydrationFreeze(effectId: string): Promise<PotionActionResult>;
  reviveHydrationStreak(input: UseStreakPotionInput): Promise<PotionActionResult>;
}

export const inventoryRemoteRepository: InventoryRemoteRepository = {
  getInventory: () => apiRequest<Inventory>('/inventory'),
  activateHydrationFreeze: input => apiRequest<PotionActionResult>('/inventory/streak-freezes', {
    method: 'POST',
    body: input,
  }),
  releaseHydrationFreeze: effectId => apiRequest<PotionActionResult>(`/inventory/streak-freezes/${effectId}`, {
    method: 'DELETE',
  }),
  reviveHydrationStreak: input => apiRequest<PotionActionResult>('/inventory/streak-revivals', {
    method: 'POST',
    body: input,
  }),
};
