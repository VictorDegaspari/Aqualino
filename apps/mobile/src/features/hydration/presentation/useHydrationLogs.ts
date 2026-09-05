import type {HydrationLogPage} from '@aqualino/contracts';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNetInfo} from '@react-native-community/netinfo';
import {hydrationService} from '../application/hydrationService';
import {hydrationLogsKey} from '../application/hydrationHistory';

export function useHydrationLogs(localDate: string, timezone: string) {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const queryKey = [...hydrationLogsKey, localDate];
  return useQuery({
    queryKey,
    networkMode: 'always',
    queryFn: () => hydrationService.logs(localDate, timezone, queryClient.getQueryData<HydrationLogPage>(queryKey), network.isConnected !== false),
  });
}
