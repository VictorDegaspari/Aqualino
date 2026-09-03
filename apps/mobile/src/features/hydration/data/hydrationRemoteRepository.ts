import type {
  HydrationToday,
  HydrationWeek,
  RecordWaterInput,
  RecordWaterResult,
  WidgetSnapshot,
} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';

export interface HydrationHomeData {
  today: HydrationToday;
  week: HydrationWeek;
  mascot: WidgetSnapshot;
}

export interface HydrationRemoteRepository {
  getHome(): Promise<HydrationHomeData>;
  record(input: RecordWaterInput): Promise<RecordWaterResult>;
  updateGoal(dailyGoalMl: number): Promise<unknown>;
}

export const hydrationRemoteRepository: HydrationRemoteRepository = {
  getHome: () => apiRequest<HydrationHomeData>('/hydration/today'),
  record: input => apiRequest<RecordWaterResult>('/hydration/logs', {method: 'POST', body: input}),
  updateGoal: dailyGoalMl => apiRequest('/hydration/goals/current', {
    method: 'PUT',
    body: {daily_goal_ml: dailyGoalMl},
  }),
};
