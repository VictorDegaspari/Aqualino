<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class HydrationQueryService
{
    public function __construct(private readonly HydrationGoalService $goals) {}

    public function today(User $user): array
    {
        $timezone = $user->profile->timezone;
        $localDate = CarbonImmutable::now($timezone)->toDateString();
        $goal = $this->goals->forDate($user, $localDate);
        $stat = DailyUserStat::query()
            ->where('user_id', $user->id)
            ->whereDate('local_date', $localDate)
            ->first();
        $total = $stat?->total_ml ?? 0;
        $goalMl = $goal?->daily_goal_ml ?? 2000;

        return [
            'local_date' => $localDate,
            'timezone' => $timezone,
            'total_ml' => $total,
            'goal_ml' => $goalMl,
            'percentage' => (int) round(($total / max(1, $goalMl)) * 100),
            'goal_achieved' => $total >= $goalMl,
            'log_count' => $stat?->log_count ?? 0,
        ];
    }

    public function logs(User $user, ?string $localDate, int $perPage = 30): LengthAwarePaginator
    {
        $date = $localDate ?: CarbonImmutable::now($user->profile->timezone)->toDateString();

        return HydrationLog::query()
            ->where('user_id', $user->id)
            ->whereDate('local_date', $date)
            ->latest('occurred_at')
            ->paginate($perPage);
    }
}
