<?php

namespace App\Modules\Gamification\Application;

use App\Models\User;
use App\Modules\Gamification\Domain\LevelProgression;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Illuminate\Support\Facades\DB;

final class UserLevelService
{
    /** @return array{hydration_penalty_count: int, xp_total: int, level: int, level_progress: array{current_xp: int, required_xp: int, remaining_xp: int, percentage: int}} */
    public function snapshot(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locked->forceFill(LevelProgression::advance($locked->xp_total, $locked->level, $locked->level_started_at_xp));
            if ($locked->isDirty()) {
                $locked->save();
            }
            $user->forceFill($locked->only(['xp_total', 'level', 'level_started_at_xp']));
            $current = max(0, $locked->xp_total - $locked->level_started_at_xp);
            $required = LevelProgression::requiredXp($locked->level);

            return [
                'hydration_penalty_count' => HydrationLog::withTrashed()->where('user_id', $locked->id)->whereNotNull('invalidated_at')->count(),
                'xp_total' => $locked->xp_total,
                'level' => $locked->level,
                'level_progress' => [
                    'current_xp' => $current,
                    'required_xp' => $required,
                    'remaining_xp' => $required - $current,
                    'percentage' => (int) floor($current / $required * 100),
                ],
            ];
        }, 3);
    }
}
