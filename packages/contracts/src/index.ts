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

export interface User {
  id: string;
  email: string;
  // Optional when restoring profiles cached before email verification was introduced.
  email_verified_at?: string | null;
  email_verification_required?: boolean;
  xp_total?: number;
  level?: number;
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
  state: 'locked' | 'available' | 'claimed';
  type: 'xp' | InventoryItemCode | null;
  amount: number | null;
}

export interface HydrationChallenge {
  id: string;
  mode: 'solo' | 'group';
  status: 'scheduled' | 'active' | 'completed';
  starts_at: string;
  ends_at: string;
  progress: HydrationWeek;
  reward: ChallengeReward | null;
}

export interface HydrationChallenges {
  solo: HydrationChallenge | null;
  group: HydrationChallenge | null;
  group_name: string | null;
  can_start_group: boolean;
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
}

export interface RecordWaterResult {
  challenges?: HydrationChallenges;
  log: HydrationLog;
  idempotent_replay: boolean;
  today: HydrationToday;
  gamification: {
    xp_awarded: number;
    xp_total: number;
    level: number;
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
}

export interface GroupInvite {
  code: string;
  expires_at: string;
}

export interface PrivateGroup {
  id: string;
  name: string;
  timezone: string;
  owner_id: string;
  max_members: number;
  members: GroupMember[];
  invite: GroupInvite | null;
}

export interface GroupInvitePreview {
  name: string;
  timezone: string;
  member_count: number;
  max_members: number;
  expires_at: string;
}

export type AchievementCode =
  | 'first_drop' | 'first_reminder' | 'first_goal' | 'team_player'
  | 'streak_3' | 'streak_7' | 'streak_14' | 'streak_30' | 'goals_7' | 'goals_30';

export interface Achievement {
  code: AchievementCode;
  category: 'beginnings' | 'consistency' | 'goals';
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
