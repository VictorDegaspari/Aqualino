import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {HydrationChallenge, HydrationChallenges} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';
import {useSessionStore} from '../../auth/application/sessionStore';
import type {HydrationHomeData} from '../../hydration/data/hydrationRemoteRepository';
import {hydrationHomeKey} from '../../hydration/presentation/useHydrationHome';
import {hydrationService} from '../../hydration/application/hydrationService';
import {AppError} from '../../../shared/errors/AppError';

type HomeCache = {data: HydrationHomeData; offline: boolean};

export function useChallengeActions() {
  const client = useQueryClient();
  const start = useMutation({
    mutationFn: (mode: 'solo' | 'group') => request<HydrationChallenges>('/hydration/challenges', {mode}),
    onMutate: () => client.cancelQueries({queryKey: hydrationHomeKey}),
    onSuccess: async challenges => {
      await client.cancelQueries({queryKey: hydrationHomeKey});
      client.setQueryData<HomeCache>(hydrationHomeKey, current => current ? {...current, data: {...current.data, challenges}, offline: false} : current);
      await hydrationService.rememberChallenges(challenges).catch(() => undefined);
      client.invalidateQueries({queryKey: hydrationHomeKey});
    },
  });
  const claim = useMutation({
    mutationFn: (id: string) => request<HydrationChallenge>(`/hydration/challenges/${encodeURIComponent(id)}/reward`),
    onSuccess: async challenge => {
      await client.cancelQueries({queryKey: hydrationHomeKey});
      client.setQueryData<HomeCache>(hydrationHomeKey, current => current?.data.challenges ? {
        ...current, data: {...current.data, challenges: {...current.data.challenges, solo: challenge}},
      } : current);
      const challenges = client.getQueryData<HomeCache>(hydrationHomeKey)?.data.challenges;
      if (challenges) await hydrationService.rememberChallenges(challenges).catch(() => undefined);
      client.invalidateQueries({queryKey: ['inventory']});
      client.invalidateQueries({queryKey: ['achievements']});
      client.invalidateQueries({queryKey: ['groups']});
      client.invalidateQueries({queryKey: hydrationHomeKey});
      useSessionStore.getState().refreshUser().catch(() => undefined);
    },
  });
  return {start: start.mutateAsync, starting: start.isPending, startError: start.error instanceof Error ? start.error.message : undefined, claim: claim.mutateAsync};
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  try {
    return await apiRequest<T>(path, {method: 'POST', body, timeoutMs: 8000});
  } catch (error) {
    if (error instanceof AppError && ['NETWORK_UNAVAILABLE', 'REQUEST_TIMEOUT'].includes(error.code)) {
      throw new AppError('Não foi possível confirmar. Conecte-se à internet e tente novamente.', error.code);
    }
    throw error;
  }
}
