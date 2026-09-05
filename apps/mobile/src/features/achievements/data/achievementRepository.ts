import type {AchievementCode, AchievementCollection} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export const achievementRepository = {
  collection(signal?: AbortSignal): Promise<AchievementCollection> {
    return apiRequest('/achievements', {signal, timeoutMs: 12_000});
  },
  reminderCreated(): Promise<AchievementCollection> {
    return apiRequest('/achievements/events', {method: 'POST', body: {event: 'reminder_created'}, timeoutMs: 12_000});
  },
  acknowledge(code: AchievementCode): Promise<{code: AchievementCode; celebrated_at: string}> {
    return apiRequest(`/achievements/${code}/celebration`, {method: 'POST', timeoutMs: 12_000});
  },
};
