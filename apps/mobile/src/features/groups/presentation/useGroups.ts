import {useCallback, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {GroupInvitePreview, PrivateGroup} from '@aqualino/contracts';
import {AppError} from '../../../shared/errors/AppError';
import {useSessionStore} from '../../auth/application/sessionStore';
import {groupsRepository} from '../data/groupsRepository';
import type {GroupsCopy} from './groupsCopy';

export const groupKey = (userId: string | undefined) => ['groups', userId, 'current'] as const;

export function groupErrorMessage(error: unknown, copy: GroupsCopy): string {
  if (!(error instanceof AppError)) return copy.actionError;
  if (error.status === 429) return copy.rateLimit;
  switch (error.code) {
    case 'NETWORK_UNAVAILABLE':
    case 'REQUEST_TIMEOUT': return copy.networkError;
    case 'GROUP_INVITE_INVALID': return copy.invalidInvite;
    case 'GROUP_FULL': return copy.full;
    case 'GROUP_ALREADY_JOINED': return copy.alreadyJoined;
    case 'GROUP_OWNER_REQUIRED': return copy.ownerRequired;
    case 'VALIDATION_FAILED': return copy.validationError;
    default: return copy.actionError;
  }
}

export function useGroups(userId: string | undefined, copy: GroupsCopy) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: groupKey(userId),
    queryFn: ({signal}) => groupsRepository.current(signal),
    enabled: Boolean(userId) && !busy,
    networkMode: 'always',
    refetchInterval: 30_000,
  });
  const [error, setError] = useState<unknown>();
  const pending = useRef(false);
  const clearError = useCallback(() => setError(undefined), []);

  const run = async <T,>(action: () => Promise<T>, updatesGroup: boolean): Promise<{value: T} | null> => {
    if (pending.current || !userId) return null;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      // Cancel older reads before a write so they cannot replace its result.
      if (updatesGroup) await queryClient.cancelQueries({queryKey: groupKey(userId)});
      if (useSessionStore.getState().user?.id !== userId) return null;
      const value = await action();
      if (updatesGroup) await queryClient.cancelQueries({queryKey: groupKey(userId)});
      if (useSessionStore.getState().user?.id !== userId) return null;
      if (updatesGroup) queryClient.setQueryData(groupKey(userId), value);
      return {value};
    } catch (cause) {
      if (useSessionStore.getState().user?.id === userId) {
        setError(cause);
        if (cause instanceof AppError && cause.code === 'GROUP_ALREADY_JOINED') {
          await queryClient.invalidateQueries({queryKey: groupKey(userId)});
        }
      }
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return {
    group: query.data,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    loadError: query.isError ? groupErrorMessage(query.error, copy) : undefined,
    error: error ? groupErrorMessage(error, copy) : undefined,
    busy, clearError,
    refresh: () => { query.refetch(); },
    create: async (name: string) => Boolean(await run<PrivateGroup>(() => groupsRepository.create(name), true)),
    preview: async (code: string): Promise<GroupInvitePreview | null> => (await run(() => groupsRepository.preview(code), false))?.value ?? null,
    accept: async (code: string) => Boolean(await run(() => groupsRepository.accept(code), true)),
    renewInvite: async () => Boolean(await run(() => groupsRepository.renewInvite(), true)),
    leave: async () => Boolean(await run(() => groupsRepository.leave(), true)),
  };
}
