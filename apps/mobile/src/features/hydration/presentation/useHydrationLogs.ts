import type {HydrationLogPage} from '@aqualino/contracts';
import {useQueries, useQueryClient} from '@tanstack/react-query';
import {useNetInfo} from '@react-native-community/netinfo';
import {hydrationService} from '../application/hydrationService';
import {useSessionStore} from '../../auth/application/sessionStore';
import {hydrationLogsKey} from '../application/hydrationHistory';

export function useHydrationLogs(localDates: string[], timezone: string, active = true) {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const userId = useSessionStore(state => state.user?.id);
  return useQueries({
    queries: localDates.map(localDate => {
      const queryKey = [...hydrationLogsKey, userId, localDate];
      return {
        queryKey,
        enabled: active,
        networkMode: 'always' as const,
        queryFn: () => hydrationService.logs(localDate, timezone, queryClient.getQueryData<HydrationLogPage>(queryKey), network.isConnected !== false),
      };
    }),
  });
}
