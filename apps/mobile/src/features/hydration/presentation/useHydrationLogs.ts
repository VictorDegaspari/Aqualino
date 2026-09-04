import {useQuery} from '@tanstack/react-query';
import {hydrationRemoteRepository} from '../data/hydrationRemoteRepository';

export function useHydrationLogs(localDate: string) {
  return useQuery({
    queryKey: ['hydration', 'logs', localDate],
    queryFn: () => hydrationRemoteRepository.getLogs(localDate),
  });
}
