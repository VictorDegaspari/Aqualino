<?php

namespace App\Modules\Gamification\Application;

use App\Models\User;
use App\Modules\Hydration\Application\HydrationQueryService;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Carbon\CarbonImmutable;

class MascotSnapshotService
{
    public function __construct(private readonly HydrationQueryService $hydration) {}

    public function forUser(User $user): array
    {
        $timezone = $user->profile->timezone;
        $now = CarbonImmutable::now($timezone);
        $today = $now->startOfDay();
        $lastLog = HydrationLog::query()
            ->where('user_id', $user->id)
            ->latest('occurred_at')
            ->first();
        $todaySummary = $this->hydration->today($user);

        if (! $lastLog) {
            $days = null;
            $condition = 'empty';
            $semanticKey = 'no_history';
        } else {
            $lastLocalDay = CarbonImmutable::instance($lastLog->occurred_at)
                ->setTimezone($timezone)
                ->startOfDay();
            $days = (int) $lastLocalDay->diffInDays($today, true);
            $condition = match (true) {
                $days >= 7 => 'skeleton',
                $days >= 3 => 'boiling',
                $days >= 1 => 'angry',
                default => 'happy',
            };
            $semanticKey = match ($days) {
                0 => 'today',
                1 => 'yesterday',
                default => 'days_ago',
            };
        }

        return [
            'schema_version' => 2,
            'generated_at' => CarbonImmutable::now('UTC')->toIso8601String(),
            'user_timezone' => $timezone,
            'last_log_at' => $lastLog?->occurred_at->utc()->toIso8601String(),
            'days_since_last_log' => $days,
            'last_log_semantic_key' => $semanticKey,
            'current_streak' => $user->streak?->current_streak ?? 0,
            'today_total_ml' => $todaySummary['total_ml'],
            'daily_goal_ml' => $todaySummary['goal_ml'],
            'condition' => $condition,
            'decoration' => null,
            'animation' => match ($condition) {
                'happy' => $todaySummary['goal_achieved'] ? 'celebrating' : 'idle_happy',
                'empty' => 'welcoming',
                default => 'idle_'.$condition,
            },
            'static_asset' => 'aqualino_'.$condition,
        ];
    }
}
