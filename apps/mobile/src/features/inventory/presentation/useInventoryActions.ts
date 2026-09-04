import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createUuid} from '../../hydration/application/createUuid';
import {inventoryRemoteRepository} from '../data/inventoryRemoteRepository';
import {inventoryKey} from './useInventory';

export function useInventoryActions() {
  const queryClient = useQueryClient();
  const refreshInventory = () => queryClient.invalidateQueries({queryKey: inventoryKey});
  const activateFreeze = useMutation({
    mutationFn: () => inventoryRemoteRepository.activateHydrationFreeze({client_action_id: createUuid()}),
    onSuccess: refreshInventory,
  });
  const releaseFreeze = useMutation({
    mutationFn: (effectId: string) => inventoryRemoteRepository.releaseHydrationFreeze(effectId),
    onSuccess: refreshInventory,
  });
  const reviveStreak = useMutation({
    mutationFn: () => inventoryRemoteRepository.reviveHydrationStreak({client_action_id: createUuid()}),
    onSuccess: refreshInventory,
  });
  return {
    activateFreeze,
    releaseFreeze,
    reviveStreak,
    actionInProgress: activateFreeze.isPending || releaseFreeze.isPending || reviveStreak.isPending,
  };
}
