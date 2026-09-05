import {useQuery} from '@tanstack/react-query';
import {useSessionStore} from '../../auth/application/sessionStore';
import {emptyAchievementCollection} from '../application/achievementCatalog';
import {readAchievementSnapshot, saveAchievementSnapshot, useAchievementLocalStore} from '../application/achievementLocalStore';
import {achievementKey} from '../application/achievementSync';
import {achievementRepository} from '../data/achievementRepository';

export function useAchievements() {
  const userId = useSessionStore(state => state.user?.id);
  const pendingReminder = useAchievementLocalStore(state => userId ? state.pendingReminders[userId] : undefined);
  const query = useQuery({
    queryKey: achievementKey(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async ({signal}) => {
      const collection = await achievementRepository.collection(signal);
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
  return {query, items, unlockedCount: items.filter(item => item.unlocked_at).length, userId};
}
