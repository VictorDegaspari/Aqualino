<?php

namespace App\Modules\Group\Application;

use App\Modules\Group\Infrastructure\Models\GroupChallengeParticipant;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class GroupChallengeScoring
{
    public const RULES = [
        'version' => 'group-v2', 'ranking' => 'competition', 'daily_points_cap' => 100, 'total_points_cap' => 700,
        'points_decimals' => 2, 'goal_policy' => 'frozen_at_start', 'minimum_reward_points' => 0.01,
        'sync_grace_minutes' => 15,
        'daily_sync_deadline' => 'local_midnight',
        'rewards' => [
            ['type' => 'xp', 'amount' => 100, 'probability' => 70],
            ['type' => 'streak_freeze', 'amount' => 1, 'probability' => 20],
            ['type' => 'streak_revive', 'amount' => 1, 'probability' => 10],
        ],
    ];

    /** @param Collection<int, GroupChallengeParticipant> $participants */
    public function standings(HydrationChallenge $challenge, Collection $participants): Collection
    {
        $logs = $challenge->finalized_at ? collect() : HydrationLog::query()->valid()
            ->whereIn('user_id', $participants->pluck('user_id'))
            ->where('occurred_at', '>=', $challenge->starts_at)
            ->where('occurred_at', '<', $challenge->ends_at)
            ->where('occurred_at', '<=', CarbonImmutable::now('UTC'))
            ->where('created_at', '<', $challenge->ends_at->addMinutes($challenge->rules['sync_grace_minutes']))
            ->get(['user_id', 'occurred_at', 'created_at', 'amount_ml'])
            ->filter(fn (HydrationLog $log): bool => $log->created_at->setTimezone($challenge->timezone)->toDateString()
                === $log->occurred_at->setTimezone($challenge->timezone)->toDateString())
            ->groupBy('user_id');
        $rows = $participants->map(function (GroupChallengeParticipant $participant) use ($challenge, $logs): array {
            $progress = $participant->final_progress ?? $this->progress($challenge, $participant->goal_ml, $logs->get($participant->user_id, collect()));
            $points = $participant->points_hundredths ?? array_sum(array_column($progress['days'], 'points_hundredths'));

            return ['participant' => $participant, 'progress' => $progress, 'points_hundredths' => $points];
        })->sort(fn (array $a, array $b): int => ($b['points_hundredths'] <=> $a['points_hundredths'])
            ?: strcmp($a['participant']->user_id, $b['participant']->user_id))->values();
        $rank = null;
        $previous = null;
        $counts = $rows->countBy('points_hundredths');

        return $rows->map(function (array $row, int $index) use (&$rank, &$previous, $counts, $challenge): array {
            $points = $row['points_hundredths'];
            if ($points !== $previous) {
                $rank = $points > 0 ? $index + 1 : null;
            }
            $previous = $points;
            $participant = $row['participant'];

            return [...$row,
                'rank' => $challenge->finalized_at ? $participant->rank : $rank,
                'tied' => $challenge->finalized_at ? $participant->tied : $counts[$points] > 1,
                'medal' => $challenge->finalized_at ? $participant->medal : ([1 => 'gold', 2 => 'silver', 3 => 'bronze'][$rank] ?? null),
            ];
        });
    }

    /** @param Collection<int, HydrationLog> $logs */
    public function progress(HydrationChallenge $challenge, int $goalMl, Collection $logs): array
    {
        $start = $challenge->starts_at->setTimezone($challenge->timezone)->startOfDay();
        $today = CarbonImmutable::now($challenge->timezone)->toDateString();
        $totals = $logs->groupBy(fn (HydrationLog $log): string => $log->occurred_at->setTimezone($challenge->timezone)->toDateString());
        $days = [];
        for ($index = 0; $index < 7; $index++) {
            $date = $start->addDays($index)->toDateString();
            $total = (int) ($totals->get($date)?->sum('amount_ml') ?? 0);
            // Round once, in integer hundredths, so displayed ties are actual ties.
            $points = intdiv(min($total, $goalMl) * 20000 + $goalMl, 2 * $goalMl);
            $days[] = [
                'date' => $date, 'weekday' => $start->addDays($index)->isoWeekday(),
                'total_ml' => $total, 'goal_ml' => $goalMl, 'percentage' => $points / 100, 'points_hundredths' => $points,
                'state' => $date > $today ? 'future' : ($total >= $goalMl ? 'goal_achieved' : ($date < $today ? 'missed' : ($total > 0 ? 'in_progress' : 'no_record'))),
                'is_today' => $date === $today, 'is_trophy' => $index === 6, 'protection' => null,
            ];
        }

        return [
            'mode' => 'challenge', 'starts_on' => $start->toDateString(), 'ends_on' => $start->addDays(6)->toDateString(),
            'current_date' => $today, 'timezone' => $challenge->timezone,
            'completed_goal_days' => collect($days)->where('state', 'goal_achieved')->count(),
            'total_ml' => array_sum(array_column($days, 'total_ml')), 'days' => $days,
        ];
    }
}
