import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useSessionStore} from '../../auth/application/sessionStore';
import {friendshipRepository, type FriendshipAction} from '../data/friendshipRepository';

export function useFriendshipActions() {
  const userId = useSessionStore(state => state.user?.id);
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['friendship-action', userId],
    mutationFn: ({personId, action}: {personId: string; action: FriendshipAction}) => {
      if (!userId || useSessionStore.getState().user?.id !== userId) throw new Error('Session changed');
      return friendshipRepository.change(personId, action);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({queryKey: ['friends', userId]}),
        client.invalidateQueries({queryKey: ['people', userId]}),
      ]);
    },
  });
}

export function useFriendships(search: string) {
  const userId = useSessionStore(state => state.user?.id);
  const list = useQuery({queryKey: ['friends', userId], queryFn: ({signal}) => friendshipRepository.list(signal), enabled: Boolean(userId)});
  const people = useQuery({queryKey: ['people', userId, 'search', search], queryFn: ({signal}) => friendshipRepository.search(search, signal), enabled: Boolean(userId && search)});
  return {list, people};
}

export function usePersonProfile(personId: string) {
  const userId = useSessionStore(state => state.user?.id);
  return useQuery({queryKey: ['people', userId, 'profile', personId], queryFn: ({signal}) => friendshipRepository.profile(personId, signal), enabled: Boolean(userId && personId)});
}
