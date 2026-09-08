import {useNetInfo} from '@react-native-community/netinfo';
import type {HydrationLogPage} from '@aqualino/contracts';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {HydrationHomeData} from '../data/hydrationRemoteRepository';
import type {PendingHydration} from '../data/outboxStore';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';
import {updateHydrationWeek} from '../application/updateHydrationWeek';
import {hydrationLogsKey, mergeHydrationLogs, pendingHydrationLog} from '../application/hydrationHistory';
import {useSessionStore} from '../../auth/application/sessionStore';
import {projectRecordingLimits} from '../application/projectRecordingLimits';
import {projectPendingChallenges} from '../application/projectPendingChallenges';

export const hydrationHomeKey = ['hydration', 'home'] as const;

export const hydrationHomeAccountKey = (userId?: string) => userId ? [...hydrationHomeKey, userId] : hydrationHomeKey;

export function useHydrationHomeData() {
  const userId = useSessionStore(state => state.user?.id);
  return useQuery({queryKey: hydrationHomeAccountKey(userId), queryFn: () => hydrationService.cachedOrRemote()});
}

export function useHydrationHome() {
  const query = useHydrationHomeData();
  const mutation = useRecordHydration();

  return {query, record: mutation.mutateAsync, isRecording: mutation.isPending};
}

export function useQuickHydration() {
  const mutation = useRecordHydration();
  const home = useHydrationHomeData();

  return {record: mutation.mutateAsync, isRecording: mutation.isPending, today: home.data?.data.today};
}

function useRecordHydration() {
  const queryClient = useQueryClient();
  const network = useNetInfo();
  const setPending = useSyncStatusStore(state => state.setPending);
  const timezone = useSessionStore(state => state.user?.profile.timezone ?? 'America/Sao_Paulo');
  const userId = useSessionStore(state => state.user?.id);
  const homeKey = hydrationHomeAccountKey(userId);
  const applyGamification = useSessionStore(state => state.applyGamification);

  return useMutation({
    mutationFn: ({amountMl, source, photoBase64}: {amountMl: number; source: PendingHydration['source']; photoBase64?: string}) =>
      hydrationService.record(amountMl, source, network.isConnected !== false, photoBase64),
    onMutate: async ({amountMl}) => {
      await queryClient.cancelQueries({queryKey: homeKey});
      const previous = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(homeKey);
      if (previous) {
        const total = previous.data.today.total_ml + amountMl;
        const today = {
          ...previous.data.today,
          total_ml: total,
          log_count: previous.data.today.log_count + 1,
          percentage: Math.round((total / Math.max(previous.data.today.goal_ml, 1)) * 100),
          goal_achieved: total >= previous.data.today.goal_ml,
        };
        queryClient.setQueryData(homeKey, {
          ...previous,
          data: {
            ...previous.data,
            today,
            week: updateHydrationWeek(previous.data.week, today),
            mascot: {...previous.data.mascot, condition: 'happy', static_asset: 'aqualino_happy'},
          },
        });
      }
      return {previous, userId};
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(homeKey, context.previous);
      }
    },
    onSuccess: async (outcome, _variables, context) => {
      if (outcome.kind === 'synced' && context?.userId) {
        applyGamification(context.userId, outcome.result.gamification);
        queryClient.invalidateQueries({queryKey: ['groups']});
      }
      await queryClient.cancelQueries({queryKey: hydrationLogsKey});
      const log = outcome.kind === 'synced' ? outcome.result.log : pendingHydrationLog(outcome.event, timezone);
      queryClient.setQueryData<HydrationLogPage>([...hydrationLogsKey, userId, log.local_date], current =>
        mergeHydrationLogs(current?.data ?? [], [log]));
      queryClient.invalidateQueries({queryKey: hydrationLogsKey});
      if (outcome.kind === 'synced') queryClient.invalidateQueries({queryKey: ['achievements']});
      if (outcome.kind === 'synced') {
        const current = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(homeKey);
        if (current) {
          queryClient.setQueryData(homeKey, {
            data: {
              ...current.data,
              challenges: outcome.result.challenges ?? current.data.challenges,
              today: outcome.result.today,
              week: updateHydrationWeek(current.data.week, outcome.result.today),
              mascot: outcome.result.widget,
            },
            offline: false,
          });
        }
      } else {
        const current = queryClient.getQueryData<{data: HydrationHomeData; offline: boolean}>(homeKey);
        if (current) {
          queryClient.setQueryData(homeKey, {...current, data: {...current.data, challenges: projectPendingChallenges(current.data.challenges, [outcome.event]), today: {...current.data.today, recording_limits: projectRecordingLimits(current.data.today.recording_limits, [outcome.event], current.data.today.log_count - 1)}}, offline: true});
        }
      }
      try {
        setPending(await hydrationService.pendingCount());
      } catch {
        // A queue counter refresh must not turn a saved drink into a failed submission.
      }
    },
  });
}
