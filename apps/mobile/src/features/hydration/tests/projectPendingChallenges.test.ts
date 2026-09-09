import type {HydrationChallenges} from '@aqualino/contracts';
import {projectPendingChallenges} from '../application/projectPendingChallenges';

const challenges: HydrationChallenges = {
  solo: {
    id: 'solo', mode: 'solo', status: 'active', starts_at: '2026-09-02T12:00:00Z', ends_at: '2026-09-09T03:00:00Z',
    progress: {
      mode: 'challenge', starts_on: '2026-09-02', ends_on: '2026-09-08', current_date: '2026-09-02', timezone: 'America/Sao_Paulo', total_ml: 0, completed_goal_days: 0,
      days: [{date: '2026-09-02', weekday: 3, state: 'no_record', total_ml: 0, goal_ml: 300, percentage: 0, is_today: true, is_trophy: false, protection: null}],
    }, reward: {state: 'locked', type: null, amount: null},
  }, group: null, group_name: 'Amigos', can_start_group: false,
};
const event = {clientEventId: 'test', amountMl: 300, occurredAt: '2026-09-02T12:30:00Z', source: 'mobile' as const, attempts: 0};

test('updates the active drop offline, keeps tomorrow locked, and never unlocks a local reward', () => {
  const state = {...challenges, group: {...challenges.solo!, mode: 'group' as const, status: 'scheduled' as const}};
  const updated = projectPendingChallenges(state, [event]);
  expect(updated?.solo?.progress.days[0]).toMatchObject({total_ml: 300, state: 'goal_achieved'});
  expect(updated?.solo?.reward?.state).toBe('locked');
  expect(updated?.group?.progress.total_ml).toBe(0);
  expect(state.solo?.progress.total_ml).toBe(0);
  expect(projectPendingChallenges(state, [])?.solo?.progress.total_ml).toBe(0);
});

test('does not project markings from outside the challenge or from future dates', () => {
  const updated = projectPendingChallenges(challenges, [
    {...event, occurredAt: '2026-09-01T12:00:00Z'}, {...event, occurredAt: '2026-09-03T12:00:00Z'},
  ]);
  expect(updated?.solo?.progress.total_ml).toBe(0);
});

test('keeps the server leaderboard unchanged while projecting the participant drop', () => {
  const group = {...challenges.solo!, mode: 'group' as const, participating: true, leaderboard: [
    {user_id: 'u', display_name: 'Ana', avatar_url: null, is_you: true, total_ml: 0, goal_ml: 300, percentage: 0, points: 0, rank: null, tied: false, medal: null},
  ]};
  const updated = projectPendingChallenges({...challenges, group}, [event]);
  expect(updated?.group?.progress.total_ml).toBe(300);
  expect(updated?.group?.leaderboard).toEqual(group.leaderboard);
  expect(projectPendingChallenges({...challenges, group: {...group, participating: false}}, [event])?.group?.progress.total_ml).toBe(0);
});

test('keeps a previous day pending log in solo progress but removes it from the group after midnight', () => {
  const progress = {...challenges.solo!.progress, current_date: '2026-09-03'};
  const state = {...challenges, solo: {...challenges.solo!, progress}, group: {...challenges.solo!, mode: 'group' as const, progress}};
  const updated = projectPendingChallenges(state, [event]);
  expect(updated?.solo?.progress.total_ml).toBe(300);
  expect(updated?.group?.progress.total_ml).toBe(0);
});
