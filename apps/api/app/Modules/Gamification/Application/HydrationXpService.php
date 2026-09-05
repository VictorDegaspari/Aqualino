<?php

namespace App\Modules\Gamification\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;

final class HydrationXpService
{
    public function todayMultiplier(User $user): float
    {
        return $this->percentageForDate($user, now($user->profile->timezone)->toDateString()) / 100;
    }

    public function percentageForDate(User $user, string $localDate): int
    {
        $saved = DailyUserStat::query()->where('user_id', $user->id)->whereDate('local_date', $localDate)->value('xp_multiplier');
        if ($saved !== null) {
            return (int) $saved;
        }
        $date = CarbonImmutable::parse($localDate, $user->profile->timezone)->startOfDay();
        $range = [$date->subDays(10)->toDateString(), $date->subDay()->toDateString()];
        $hydrated = DailyUserStat::query()->where('user_id', $user->id)->where('total_ml', '>=', 50)
            ->whereDate('local_date', '>=', $range[0])->whereDate('local_date', '<=', $range[1])->pluck('local_date');
        $protected = StreakPotionEffect::query()->whereBelongsTo($user)->where('scope_type', 'hydration')
            ->where('status', StreakPotionEffectStatus::Consumed->value)->whereDate('target_local_date', '>=', $range[0])->whereDate('target_local_date', '<=', $range[1])->pluck('target_local_date');
        $dates = $hydrated->merge($protected)->mapWithKeys(fn ($day): array => [CarbonImmutable::parse($day)->toDateString() => true]);
        $percentage = 100;
        $cursor = $date->subDay();
        while ($percentage < 200 && $dates->has($cursor->toDateString())) {
            $percentage += 10;
            $cursor = $cursor->subDay();
        }

        return $percentage;
    }

    public function multiply(int $baseXp, int $percentage): int
    {
        return intdiv($baseXp * $percentage + 50, 100);
    }
}
