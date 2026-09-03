<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class WeeklyHydrationQuery
{
    /**
     * @return array<string, mixed>
     */
    public function forUser(User $user): array
    {
        $timezone = $user->profile?->timezone ?? 'UTC';
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $startsOn = $today->startOfWeek(CarbonInterface::MONDAY);
        $endsOn = $startsOn->addDays(6);
        $stats = DailyUserStat::query()
            ->where('user_id', $user->id)
            ->whereBetween('local_date', [$startsOn->toDateString(), $endsOn->toDateString()])
            ->get()
            ->keyBy(fn (DailyUserStat $stat): string => $stat->local_date->toDateString());
        $goals = HydrationGoal::query()
            ->whereBelongsTo($user)
            ->whereDate('starts_on', '<=', $endsOn->toDateString())
            ->where(fn ($query) => $query
                ->whereNull('ends_on')
                ->orWhereDate('ends_on', '>=', $startsOn->toDateString()))
            ->oldest('starts_on')
            ->get();
        $protections = StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('scope_type', 'hydration')
            ->where('status', StreakPotionEffectStatus::Consumed->value)
            ->whereBetween('target_local_date', [$startsOn->toDateString(), $endsOn->toDateString()])
            ->get()
            ->keyBy(fn (StreakPotionEffect $effect): string => $effect->target_local_date->toDateString());
        $days = [];

        for ($position = 0; $position < 7; $position++) {
            $date = $startsOn->addDays($position);
            $stat = $stats->get($date->toDateString());
            $goalMl = $this->goalForDate($goals, $date)?->daily_goal_ml ?? 2000;
            $totalMl = $stat?->total_ml ?? 0;
            $effect = $protections->get($date->toDateString());

            $days[] = [
                'date' => $date->toDateString(),
                'weekday' => $position + 1,
                'state' => $this->stateForDate($date, $today, $totalMl, $goalMl),
                'total_ml' => $totalMl,
                'goal_ml' => $goalMl,
                'percentage' => min(100, (int) round(($totalMl / max(1, $goalMl)) * 100)),
                'is_today' => $date->isSameDay($today),
                'is_trophy' => $position === 6,
                'protection' => $effect?->item_code->value,
            ];
        }

        return [
            'mode' => 'civil_week',
            'starts_on' => $startsOn->toDateString(),
            'ends_on' => $endsOn->toDateString(),
            'current_date' => $today->toDateString(),
            'timezone' => $timezone,
            'completed_goal_days' => collect($days)->where('state', 'goal_achieved')->count(),
            'total_ml' => collect($days)->sum('total_ml'),
            'days' => $days,
        ];
    }

    /**
     * @param  Collection<int, HydrationGoal>  $goals
     */
    private function goalForDate(Collection $goals, CarbonImmutable $date): ?HydrationGoal
    {
        return $goals
            ->filter(fn (HydrationGoal $goal): bool => $goal->starts_on->lessThanOrEqualTo($date)
                && ($goal->ends_on === null || $goal->ends_on->greaterThanOrEqualTo($date)))
            ->last();
    }

    private function stateForDate(
        CarbonImmutable $date,
        CarbonImmutable $today,
        int $totalMl,
        int $goalMl,
    ): string {
        if ($date->isAfter($today)) {
            return 'future';
        }

        if ($totalMl >= $goalMl) {
            return 'goal_achieved';
        }

        if ($date->isBefore($today)) {
            return 'missed';
        }

        return $totalMl > 0 ? 'in_progress' : 'no_record';
    }
}
