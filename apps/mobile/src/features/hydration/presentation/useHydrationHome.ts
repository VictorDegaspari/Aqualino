import {useNetInfo} from '@react-native-community/netinfo';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import type {PendingHydration} from '../data/outboxStore';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';
import {updateHydrationWeek} from '../application/updateHydrationWeek';

export const hydrationHomeKey = ['hydration', 'home'] as const;

export function useHydrationHome() {
  const query = useQuery({queryKey: hydrationHomeKey, queryFn: () => hydrationService.cachedOrRemote()});
  const mutation = useRecordHydration();

  return {query, record: mutation.mutateAsync, isRecording: mutation.isPending};
}

export function useQuickHydration() {
  const mutation = useRecordHydration();

  return {record: mutation.mutateAsync, isRecording: mutation.isPending};
}

function useRecordHydration() {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const setPending = useSyncStatusStore(state => state.setPending);

  return useMutation({
    mutationFn: ({amountMl, source}: {amountMl: number; source: PendingHydration['source']}) =>
      hydrationService.record(amountMl, source, network.isConnected !== false),
    onMutate: async ({amountMl}) => {
      await queryClient.cancelQueries({queryKey: hydrationHomeKey});
      const previous = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(hydrationHomeKey);
      if (previous) {
        const total = previous.data.today.total_ml + amountMl;
        const today = {
          ...previous.data.today,
          total_ml: total,
          log_count: previous.data.today.log_count + 1,
          percentage: Math.round((total / Math.max(previous.data.today.goal_ml, 1)) * 100),
          goal_achieved: total >= previous.data.today.goal_ml,
        };
        queryClient.setQueryData(hydrationHomeKey, {
          ...previous,
          data: {
            today,
            week: updateHydrationWeek(previous.data.week, today),
            mascot: {...previous.data.mascot, condition: 'happy', static_asset: 'aqualino_happy'},
          },
        });
      }
      return {previous};
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(hydrationHomeKey, context.previous);
      }
    },
    onSuccess: async outcome => {
      if (outcome.kind === 'synced') {
        const current = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(hydrationHomeKey);
        if (current) {
          queryClient.setQueryData(hydrationHomeKey, {
            data: {
              today: outcome.result.today,
              week: updateHydrationWeek(current.data.week, outcome.result.today),
              mascot: outcome.result.widget,
            },
            offline: false,
          });
        }
      } else {
        const current = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(hydrationHomeKey);
        if (current) {
          queryClient.setQueryData(hydrationHomeKey, {...current, offline: true});
        }
      }
      setPending(await hydrationService.pendingCount());
    },
  });
}
