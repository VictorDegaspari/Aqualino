<?php

namespace App\Modules\Achievement\Application;

use App\Models\User;
use App\Modules\Achievement\Domain\AchievementCatalog;
use App\Modules\Achievement\Infrastructure\Models\UserAchievement;
use App\Modules\Gamification\Infrastructure\Models\UserStreak;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class AchievementService
{
    /** @return list<string> */
    public function reconcile(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $progress = $this->progress($user);
            $owned = UserAchievement::query()->where('user_id', $user->id)->pluck('code')->all();
            $new = [];
            foreach (AchievementCatalog::DEFINITIONS as $code => $definition) {
                if (! in_array($code, $owned, true) && $progress[$definition['metric']] >= $definition['target']) {
                    if ($this->grant($user, $code)) {
                        $new[] = $code;
                    }
                }
            }

            return $new;
        }, 3);
    }

    public function grant(User $user, string $code): bool
    {
        if (! isset(AchievementCatalog::DEFINITIONS[$code])) {
            throw new InvalidArgumentException('Unknown achievement code.');
        }

        return UserAchievement::query()->insertOrIgnore([
            'id' => (string) Str::ulid(), 'user_id' => $user->id,
            'code' => $code, 'unlocked_at' => now(),
        ]) === 1;
    }

    /** @return array{items: list<array<string, mixed>>, unlocked_count: int, total: int} */
    public function collection(User $user): array
    {
        $this->reconcile($user);
        $progress = $this->progress($user);
        $owned = UserAchievement::query()->where('user_id', $user->id)->get()->keyBy('code');
        $items = [];
        foreach (AchievementCatalog::DEFINITIONS as $code => $definition) {
            $award = $owned->get($code);
            $items[] = [
                'code' => $code,
                'category' => $definition['category'],
                'rank' => $definition['rank'],
                'target' => $definition['target'],
                'progress' => $award ? $definition['target'] : min($definition['target'], $progress[$definition['metric']]),
                'unlocked_at' => $award?->unlocked_at->toIso8601String(),
                'celebrated_at' => $award?->celebrated_at?->toIso8601String(),
            ];
        }

        return ['items' => $items, 'unlocked_count' => $owned->count(), 'total' => count($items)];
    }

    public function recordReminder(User $user): array
    {
        $this->grant($user, 'first_reminder');

        return $this->collection($user);
    }

    public function acknowledge(User $user, string $code): array
    {
        $award = UserAchievement::query()->where('user_id', $user->id)->where('code', $code)->firstOrFail();
        UserAchievement::query()->whereKey($award->id)->whereNull('celebrated_at')->update(['celebrated_at' => now()]);

        return ['code' => $code, 'celebrated_at' => $award->fresh()->celebrated_at->toIso8601String()];
    }

    /** @return array{records: int, reminders: int, teams: int, goals: int, streak: int} */
    private function progress(User $user): array
    {
        return [
            'records' => (int) HydrationLog::query()->where('user_id', $user->id)->exists(),
            'reminders' => (int) UserAchievement::query()->where('user_id', $user->id)->where('code', 'first_reminder')->exists(),
            'teams' => (int) GroupMembership::query()->where('user_id', $user->id)->exists(),
            'goals' => DailyUserStat::query()->where('user_id', $user->id)->whereNotNull('goal_achieved_at')->count(),
            'streak' => (int) (UserStreak::query()->find($user->id)?->longest_streak ?? 0),
        ];
    }
}
