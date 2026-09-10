import type {AchievementCode} from '@aqualino/contracts';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useSessionStore} from '../../auth/application/sessionStore';
import {emptyAchievementCollection} from '../application/achievementCatalog';
import {readAchievementSnapshot, saveAchievementSnapshot, useAchievementLocalStore} from '../application/achievementLocalStore';
import {achievementKey, synchronizeAchievements} from '../application/achievementSync';
import {achievementRepository} from '../data/achievementRepository';

export function useAchievements() {
  const queryClient = useQueryClient();
  const userId = useSessionStore(state => state.user?.id);
  const localProfileCodes = useAchievementLocalStore(state => userId ? state.profileHighlights[userId] : undefined);
  const pendingReminder = useAchievementLocalStore(state => userId ? state.pendingReminders[userId] : undefined);
  const query = useQuery({
    queryKey: achievementKey(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async ({signal}) => {
      let collection = await achievementRepository.collection(signal);
      const local = userId ? useAchievementLocalStore.getState().profileHighlights[userId] : undefined;
      if (collection.profile_highlights === null && local !== undefined && !signal.aborted && useSessionStore.getState().user?.id === userId && !pendingReminder) {
        try {
          collection = await achievementRepository.saveHighlights(local.filter(code => collection.items.some(item => item.code === code && item.unlocked_at)), signal);
        } catch { /* Retain the local selection until the next successful connection. */ }
      }
      if (userId && !signal.aborted && useSessionStore.getState().user?.id === userId) saveAchievementSnapshot(userId, collection);
      return collection;
    },
    initialData: () => userId ? readAchievementSnapshot(userId) : undefined,
    initialDataUpdatedAt: 0,
    networkMode: 'always',
  });
  const items = (query.data ?? emptyAchievementCollection).items.map(item =>
    pendingReminder && item.code === 'first_reminder' && !item.unlocked_at
      ? {...item, unlocked_at: pendingReminder, progress: item.target}
      : item,
  );
  const profileCodes = query.data?.profile_highlights ?? localProfileCodes;
  const saveHighlights = async (codes: AchievementCode[]): Promise<boolean> => {
    if (!userId || useSessionStore.getState().user?.id !== userId) return false;
    try {
      await synchronizeAchievements(userId, queryClient);
      await queryClient.cancelQueries({queryKey: achievementKey(userId)});
      if (useSessionStore.getState().user?.id !== userId) return false;
      const collection = await achievementRepository.saveHighlights(codes);
      if (useSessionStore.getState().user?.id !== userId) return false;
      saveAchievementSnapshot(userId, collection);
      useAchievementLocalStore.getState().saveProfileHighlights(userId, codes);
      queryClient.setQueryData(achievementKey(userId), collection);
      await queryClient.invalidateQueries({queryKey: ['people', userId]});
      return true;
    } catch {return false;}
  };
  return {query, items, saveHighlights, unlockedCount: items.filter(item => item.unlocked_at).length, userId, profileCodes};
}
