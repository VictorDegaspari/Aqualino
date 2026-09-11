import type {FriendshipCollection, PersonProfile, PersonSummary} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export type FriendshipAction = 'request' | 'accept' | 'remove';
export const friendshipRepository = {
  list: (signal?: AbortSignal): Promise<FriendshipCollection> => apiRequest('/friends', {signal, timeoutMs: 12_000}),
  search: (query: string, signal?: AbortSignal): Promise<PersonSummary[]> => apiRequest(`/people?query=${encodeURIComponent(query)}`, {signal, timeoutMs: 12_000}),
  profile: (userId: string, signal?: AbortSignal): Promise<PersonProfile> => apiRequest(`/people/${encodeURIComponent(userId)}`, {signal, timeoutMs: 12_000}),
  change: (userId: string, action: FriendshipAction): Promise<PersonSummary> => apiRequest(`/friends/${encodeURIComponent(userId)}${action === 'accept' ? '/accept' : ''}`, {
    method: action === 'request' ? 'PUT' : action === 'accept' ? 'POST' : 'DELETE', timeoutMs: 12_000,
  }),
};
