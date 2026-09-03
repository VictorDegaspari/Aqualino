<?php

namespace App\Modules\Gamification\Application;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\UserStreak;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;

class StreakCalculator
{
    public function recalculate(User $user): UserStreak
    {
        $timezone = $user->profile->timezone;
        $hydratedDates = DailyUserStat::query()
            ->where('user_id', $user->id)
            ->where('total_ml', '>=', 50)
            ->orderBy('local_date')
            ->pluck('local_date');
        $protectedDates = StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('scope_type', 'hydration')
            ->where('status', StreakPotionEffectStatus::Consumed->value)
            ->whereNotNull('target_local_date')
            ->pluck('target_local_date');
        $dates = $hydratedDates
            ->merge($protectedDates)
            ->unique()
            ->sort()
            ->map(fn ($date) => CarbonImmutable::parse((string) $date, $timezone)->startOfDay())
            ->values();

        $dateSet = $dates->mapWithKeys(fn (CarbonImmutable $date) => [$date->toDateString() => true]);
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $cursor = $dateSet->has($today->toDateString()) ? $today : $today->subDay();
        $current = 0;

        while ($dateSet->has($cursor->toDateString())) {
            $current++;
            $cursor = $cursor->subDay();
        }

        $longest = 0;
        $running = 0;
        $previous = null;

        foreach ($dates as $date) {
            $running = $previous && $previous->addDay()->isSameDay($date) ? $running + 1 : 1;
            $longest = max($longest, $running);
            $previous = $date;
        }

        return UserStreak::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'current_streak' => $current,
                'longest_streak' => $longest,
                'last_hydration_date' => $dates->last()?->toDateString(),
                'updated_at' => now(),
            ],
        );
    }
}
