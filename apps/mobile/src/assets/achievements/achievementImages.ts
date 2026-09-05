import type {AchievementCode} from '@aqualino/contracts';
import type {ImageSourcePropType} from 'react-native';

export const achievementImages: Record<AchievementCode, ImageSourcePropType> = {
  first_drop: require('./first_drop.png'), first_reminder: require('./first_reminder.png'),
  first_goal: require('./first_goal.png'), team_player: require('./team_player.png'),
  streak_3: require('./streak_3.png'), streak_7: require('./streak_7.png'),
  streak_14: require('./streak_14.png'), streak_30: require('./streak_30.png'),
  goals_7: require('./goals_7.png'), goals_30: require('./goals_30.png'),
};
