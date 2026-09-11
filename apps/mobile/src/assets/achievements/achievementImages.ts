import type {AchievementCode} from '@aqualino/contracts';
import type {ImageSourcePropType} from 'react-native';

export const achievementImages: Record<AchievementCode, ImageSourcePropType> = {
  first_drop: require('./characters/first_drop.webp'), first_reminder: require('./characters/first_reminder.webp'),
  first_goal: require('./characters/first_goal.webp'), team_player: require('./characters/team_player.webp'),
  streak_3: require('./characters/streak.webp'), streak_7: require('./characters/streak.webp'),
  streak_14: require('./characters/streak.webp'), streak_30: require('./characters/streak.webp'),
  goals_7: require('./characters/first_goal.webp'), goals_30: require('./characters/first_goal.webp'),
  level_5: require('./characters/level.webp'), level_10: require('./characters/level.webp'),
  level_50: require('./characters/level.webp'), level_100: require('./characters/level.webp'),
};
