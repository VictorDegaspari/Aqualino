import type {
  HydrationToday,
  HydrationChallenges,
  HydrationWeek,
  HydrationLogPage,
  RecordWaterInput,
  RecordWaterResult,
  WidgetSnapshot,
} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export interface HydrationHomeData {
  challenges?: HydrationChallenges;
  today: HydrationToday;
  week: HydrationWeek;
  mascot: WidgetSnapshot;
}

export interface HydrationRemoteRepository {
  getHome(): Promise<HydrationHomeData>;
  getLogs(localDate: string, page?: number): Promise<HydrationLogPage>;
  record(input: RecordWaterInput): Promise<RecordWaterResult>;
  updateGoal(dailyGoalMl: number): Promise<unknown>;
}

export const hydrationRemoteRepository: HydrationRemoteRepository = {
  getHome: () => apiRequest<HydrationHomeData>('/hydration/today'),
  getLogs: (localDate, page = 1) => apiRequest<HydrationLogPage>(
    `/hydration/logs?local_date=${encodeURIComponent(localDate)}&page=${page}&per_page=100`,
    {unwrapData: false},
  ),
  record: input => apiRequest<RecordWaterResult>('/hydration/logs', {method: 'POST', body: input, timeoutMs: 8000}),
  updateGoal: dailyGoalMl => apiRequest('/hydration/goals/current', {
    method: 'PUT',
    body: {daily_goal_ml: dailyGoalMl},
  }),
};
