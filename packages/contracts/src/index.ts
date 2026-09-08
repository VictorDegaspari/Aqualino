export type MascotCondition =
  | 'empty'
  | 'happy'
  | 'angry'
  | 'boiling'
  | 'skeleton';

export interface UserProfile {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  favorite_volumes_ml: number[];
  onboarding_completed_at: string | null;
}

export interface LevelProgress {
  current_xp: number;
  required_xp: number;
  remaining_xp: number;
  percentage: number;
}

export interface User {
  id: string;
  email: string;
  // Optional when restoring profiles cached before email verification was introduced.
  email_verified_at?: string | null;
  email_verification_required?: boolean;
  xp_total?: number;
  hydration_penalty_count?: number;
  xp_multiplier?: number;
  level?: number;
  level_progress?: LevelProgress;
  group_medals?: {gold: number; silver: number; bronze: number};
  streak?: number;
  profile: UserProfile;
}

export interface HydrationToday {
  local_date: string;
  timezone: string;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  goal_achieved: boolean;
  log_count: number;
  recording_limits?: HydrationRecordingLimits;
}

export interface HydrationRecordingLimits {
  daily_limit: number;
  minimum_interval_seconds: number;
  recorded_today: number;
  remaining_today: number;
  next_allowed_at: string | null;
  server_now: string;
}

export interface HydrationReview {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  amount_ml: number;
  occurred_at: string;
  photo_path: string | null;
  status: 'pending' | 'valid' | 'invalid';
  expires_at: string | null;
  invalidated_at: string | null;
  eligible_voters: number;
  invalid_votes_required: number;
  valid_votes: number;
  invalid_votes: number;
  abstentions: number;
  your_vote: 'valid' | 'invalid' | null;
  can_vote: boolean;
}

export interface HydrationReviewPage {
  data: HydrationReview[];
  meta: {current_page: number; last_page: number; total: number};
}

export type HydrationWeekDayState =
  | 'future'
  | 'no_record'
  | 'in_progress'
  | 'goal_achieved'
  | 'missed';

export interface HydrationWeekDay {
  date: string;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  state: HydrationWeekDayState;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  is_today: boolean;
  is_trophy: boolean;
  protection: InventoryItemCode | null;
}

export interface HydrationWeek {
  mode: 'civil_week' | 'challenge';
  starts_on: string;
  ends_on: string;
  current_date: string;
  timezone: string;
  completed_goal_days: number;
  total_ml: number;
  days: HydrationWeekDay[];
}

export interface ChallengeReward {
  state: 'locked' | 'reviewing' | 'available' | 'claimed';
  type: 'xp' | InventoryItemCode | null;
  amount: number | null;
}

export interface HydrationChallenge {
  id: string;
  mode: 'solo' | 'group';
  status: 'scheduled' | 'active' | 'settling' | 'completed' | 'cancelled';
  starts_at: string;
  ends_at: string;
  progress: HydrationWeek;
  reward: ChallengeReward | null;
  group_id?: string;
  participating?: boolean;
  rules?: GroupChallengeRules;
  sync_deadline_at?: string;
  review_deadline_at?: string;
  finalized_at?: string | null;
  leaderboard?: GroupLeaderboardEntry[];
}

export interface GroupChallengeRules {
  version: string;
  ranking: 'competition';
  daily_points_cap: number;
  total_points_cap: number;
  points_decimals: number;
  goal_policy: 'frozen_at_start';
  minimum_reward_points: number;
  sync_grace_minutes: number;
  rewards: {type: 'xp' | InventoryItemCode; amount: number; probability: number}[];
}

export interface GroupLeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_you: boolean;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  points: number;
  rank: number | null;
  tied: boolean;
  medal: 'gold' | 'silver' | 'bronze' | null;
}

export interface HydrationChallenges {
  solo: HydrationChallenge | null;
  group: HydrationChallenge | null;
  group_name: string | null;
  can_start_group: boolean;
  group_result?: HydrationChallenge | null;
  group_rules?: GroupChallengeRules;
}

export interface WidgetSnapshot {
  schema_version: 2;
  generated_at: string;
  user_timezone: string;
  last_log_at: string | null;
  days_since_last_log: number | null;
  last_log_semantic_key: 'no_history' | 'today' | 'yesterday' | 'days_ago';
  current_streak: number;
  today_total_ml: number;
  daily_goal_ml: number;
  condition: MascotCondition;
  decoration: string | null;
  animation: string;
  static_asset: string;
}

export interface HydrationLog {
  id: string;
  amount_ml: number;
  occurred_at: string;
  local_date: string;
  source: 'mobile' | 'widget' | 'shortcut' | 'import';
  client_event_id: string;
  invalidated_at?: string | null;
  review_expires_at?: string | null;
}

export interface HydrationLogPage {
  data: HydrationLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface RecordWaterInput {
  amount_ml: number;
  occurred_at?: string;
  source: HydrationLog['source'];
  client_event_id: string;
  photo_base64?: string;
}

export interface RecordWaterResult {
  challenges?: HydrationChallenges;
  log: HydrationLog;
  idempotent_replay: boolean;
  today: HydrationToday;
  gamification: {
    xp_awarded: number;
    xp_multiplier?: number;
    awarded_xp_multiplier?: number;
    xp_total: number;
    hydration_penalty_count?: number;
    level: number;
    level_progress?: LevelProgress;
    streak: number;
    new_achievements: AchievementCode[];
  };
  mascot: Pick<WidgetSnapshot, 'condition' | 'decoration' | 'animation' | 'static_asset'>;
  widget: WidgetSnapshot;
}

export type InventoryItemCode = 'streak_freeze' | 'streak_revive';

export interface InventoryItem {
  code: InventoryItemCode;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

export type StreakPotionEffectStatus = 'armed' | 'suspended' | 'consumed' | 'released';

export interface HydrationFreezeState {
  id: string;
  status: Extract<StreakPotionEffectStatus, 'armed' | 'suspended'>;
  eligible_from: string;
  created_at: string;
}

export interface InventoryUsage {
  blocked_by_group_challenge: boolean;
  hydration_freeze: HydrationFreezeState | null;
}

export interface Inventory {
  items: InventoryItem[];
  usage: InventoryUsage;
}

export interface StreakPotionEffect {
  id: string;
  item_code: InventoryItemCode;
  scope_type: 'hydration';
  status: Exclude<StreakPotionEffectStatus, 'suspended'>;
  eligible_from: string | null;
  target_local_date: string | null;
  created_at: string;
}

export interface UseStreakPotionInput {
  client_action_id: string;
}

export interface PotionActionResult {
  effect: StreakPotionEffect;
  inventory: Inventory;
  streak: number;
  idempotent_replay: boolean;
}

export interface GroupMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'member';
  level: number;
}

export interface GroupInvite {
  code: string;
  expires_at: string;
}

export interface PrivateGroup {
  photo_review_enabled?: boolean;
  id: string;
  name: string;
  timezone: string;
  owner_id: string;
  max_members: number;
  members: GroupMember[];
  invite: GroupInvite | null;
  challenge?: HydrationChallenge | null;
  previous_challenge?: HydrationChallenge | null;
  challenge_rules?: GroupChallengeRules;
}

export interface GroupInvitePreview {
  name: string;
  timezone: string;
  member_count: number;
  max_members: number;
  expires_at: string;
}

export type LevelAchievementCode = 'level_5' | 'level_10' | 'level_50' | 'level_100';

export type AchievementCode =
  | LevelAchievementCode
  | 'first_drop' | 'first_reminder' | 'first_goal' | 'team_player'
  | 'streak_3' | 'streak_7' | 'streak_14' | 'streak_30' | 'goals_7' | 'goals_30';

export interface Achievement {
  code: AchievementCode;
  category: 'beginnings' | 'consistency' | 'goals' | 'levels';
  rank: number;
  target: number;
  progress: number;
  unlocked_at: string | null;
  celebrated_at: string | null;
}

export interface AchievementCollection {
  items: Achievement[];
  unlocked_count: number;
  total: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields: Record<string, string[]>;
    request_id: string;
  };
}

export interface ApiEnvelope<T> {
  data: T;
}
