import {useQuery} from '@tanstack/react-query';
import {inventoryRemoteRepository} from '../data/inventoryRemoteRepository';

export const inventoryKey = ['inventory'] as const;

export function useInventory() {
  return useQuery({
    queryKey: inventoryKey,
    queryFn: () => inventoryRemoteRepository.getInventory(),
  });
}
