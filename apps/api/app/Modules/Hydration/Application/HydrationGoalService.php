<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class HydrationGoalService
{
    public function forDate(User $user, string $localDate): ?HydrationGoal
    {
        return HydrationGoal::query()
            ->where('user_id', $user->id)
            ->whereDate('starts_on', '<=', $localDate)
            ->where(fn ($query) => $query
                ->whereNull('ends_on')
                ->orWhereDate('ends_on', '>=', $localDate))
            ->latest('starts_on')
            ->first();
    }

    public function replaceCurrent(User $user, int $dailyGoalMl): HydrationGoal
    {
        $timezone = $user->profile->timezone;
        $today = CarbonImmutable::now($timezone)->startOfDay();

        return DB::transaction(function () use ($user, $dailyGoalMl, $today): HydrationGoal {
            $current = $this->forDate($user, $today->toDateString());

            if ($current && $current->starts_on->isSameDay($today)) {
                $current->update(['daily_goal_ml' => $dailyGoalMl]);

                return $current->fresh();
            }

            if ($current) {
                $current->update(['ends_on' => $today->subDay()->toDateString()]);
            }

            return HydrationGoal::query()->create([
                'user_id' => $user->id,
                'daily_goal_ml' => $dailyGoalMl,
                'starts_on' => $today->toDateString(),
                'source' => 'user',
            ]);
        });
    }
}
