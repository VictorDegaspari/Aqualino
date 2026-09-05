import type {Achievement, AchievementCode, AchievementCollection} from '@aqualino/contracts';

// Bundled display metadata lets the collection render before its first connection.
// Only the server unlocks hydration and team milestones.
const definitions: Array<[AchievementCode, Achievement['category'], number, number]> = [
  ['first_drop', 'beginnings', 1, 10], ['first_reminder', 'beginnings', 1, 20],
  ['first_goal', 'beginnings', 1, 30], ['team_player', 'beginnings', 1, 40],
  ['streak_3', 'consistency', 3, 50], ['streak_7', 'consistency', 7, 60],
  ['goals_7', 'goals', 7, 70], ['streak_14', 'consistency', 14, 80],
  ['goals_30', 'goals', 30, 90], ['streak_30', 'consistency', 30, 100],
];

export const emptyAchievementCollection: AchievementCollection = {
  items: definitions.map(([code, category, target, rank]) => ({code, category, target, rank, progress: 0, unlocked_at: null, celebrated_at: null})),
  unlocked_count: 0, total: definitions.length,
};

export function featuredAchievements(items: Achievement[]): Achievement[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.unlocked_at) !== Boolean(b.unlocked_at)) return a.unlocked_at ? -1 : 1;
    return a.unlocked_at ? b.rank - a.rank : a.rank - b.rank;
  }).slice(0, 4);
}
