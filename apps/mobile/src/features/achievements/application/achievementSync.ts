import type {QueryClient} from '@tanstack/react-query';
import {useSessionStore} from '../../auth/application/sessionStore';
import {achievementRepository} from '../data/achievementRepository';
import {saveAchievementSnapshot, useAchievementLocalStore} from './achievementLocalStore';

export const achievementKey = (userId: string) => ['achievements', userId] as const;
const inFlight = new Map<string, Promise<void>>();

export function synchronizeAchievements(userId: string, queryClient: QueryClient): Promise<void> {
  const current = inFlight.get(userId);
  if (current) return current;
  const operation = flush(userId, queryClient).finally(() => inFlight.delete(userId));
  inFlight.set(userId, operation);
  return operation;
}

async function flush(userId: string, queryClient: QueryClient): Promise<void> {
  const isCurrentAccount = () => useSessionStore.getState().status === 'signedIn' && useSessionStore.getState().user?.id === userId;
  while (isCurrentAccount()) {
    // A reminder can be created while an earlier celebration is being acknowledged.
    if (useAchievementLocalStore.getState().pendingReminders[userId]) {
      await queryClient.cancelQueries({queryKey: achievementKey(userId)});
      if (!isCurrentAccount()) return;
      const collection = await achievementRepository.reminderCreated();
      await queryClient.cancelQueries({queryKey: achievementKey(userId)});
      if (!isCurrentAccount()) return;
      saveAchievementSnapshot(userId, collection);
      queryClient.setQueryData(achievementKey(userId), collection);
      useAchievementLocalStore.getState().reminderSynced(userId);
      continue;
    }
    const code = useAchievementLocalStore.getState().pendingAcknowledgements[userId]?.[0];
    if (!code) return;
    await achievementRepository.acknowledge(code);
    useAchievementLocalStore.getState().acknowledgementSynced(userId, code);
  }
}
