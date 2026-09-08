<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Gamification\Application\HydrationXpService;
use App\Modules\Gamification\Application\StreakCalculator;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;

class RecalculateHydrationDay
{
    public function __construct(private readonly HydrationXpService $xp, private readonly StreakCalculator $streaks) {}

    public function handle(User $user, string $date): void
    {
        $stat = DailyUserStat::query()->where('user_id', $user->id)->whereDate('local_date', $date)->lockForUpdate()->firstOrFail();
        $logs = HydrationLog::query()->valid()->where('user_id', $user->id)->whereDate('local_date', $date)
            ->oldest('created_at')->oldest('id')->get();
        $total = 0;
        $recordXp = 0;
        $earned = 0;
        $achievedAt = null;
        foreach ($logs as $index => $log) {
            $base = min($index === 0 ? 10 : 5, max(0, 50 - $recordXp));
            $bonus = $total < $stat->goal_ml_snapshot && $total + $log->amount_ml >= $stat->goal_ml_snapshot ? 25 : 0;
            $awarded = $this->xp->multiply($recordXp + $base, $stat->xp_multiplier)
                - $this->xp->multiply($recordXp, $stat->xp_multiplier)
                + $this->xp->multiply($bonus, $stat->xp_multiplier);
            $log->update(['xp_awarded' => $awarded]);
            $recordXp += $base;
            $earned += $awarded;
            $total += $log->amount_ml;
            if ($bonus > 0) {
                $achievedAt = $log->created_at;
            }
        }
        $delta = $earned - $stat->xp_earned;
        $stat->update([
            'total_ml' => $total, 'log_count' => $logs->count(), 'record_xp_earned' => $recordXp,
            'xp_earned' => $earned, 'goal_achieved_at' => $achievedAt,
        ]);
        $user->update(['xp_total' => max(0, $user->xp_total + $delta)]);
        $this->streaks->recalculate($user);
    }
}
