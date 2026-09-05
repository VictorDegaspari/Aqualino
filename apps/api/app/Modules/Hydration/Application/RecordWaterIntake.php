<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Gamification\Application\HydrationXpService;
use App\Modules\Gamification\Application\StreakCalculator;
use App\Modules\Gamification\Application\UserLevelService;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Inventory\Application\ApplyArmedHydrationStreakFreeze;
use App\Shared\Infrastructure\Models\OutboxEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordWaterIntake
{
    private const DAILY_RECORD_XP_CAP = 50;

    public function __construct(
        private readonly HydrationGoalService $goals,
        private readonly StreakCalculator $streaks,
        private readonly ApplyArmedHydrationStreakFreeze $applyStreakFreeze,
        private readonly AchievementService $achievements,
        private readonly UserLevelService $levels,
        private readonly HydrationXpService $xp,
    ) {}

    public function handle(User $user, array $input): array
    {
        $existing = HydrationLog::query()
            ->where('user_id', $user->id)
            ->where('client_event_id', $input['client_event_id'])
            ->first();

        if ($existing) {
            $this->applyStreakFreeze->handle($user, $existing->local_date->toDateString());
            $this->streaks->recalculate($user);

            return ['log' => $existing, 'idempotent_replay' => true, 'new_achievements' => $this->achievements->reconcile($user)];
        }

        $receivedAt = CarbonImmutable::now('UTC');
        $occurredAt = isset($input['occurred_at'])
            ? CarbonImmutable::parse($input['occurred_at'])->utc()
            : $receivedAt;

        if ($occurredAt->isAfter($receivedAt)) {
            throw ValidationException::withMessages([
                'occurred_at' => ['O horário não pode estar no futuro.'],
            ]);
        }

        $timezone = $user->profile->timezone;
        $localDate = $occurredAt->setTimezone($timezone)->toDateString();

        $result = DB::transaction(function () use ($user, $input, $occurredAt, $timezone, $localDate): array {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $existing = HydrationLog::query()->where('user_id', $user->id)->where('client_event_id', $input['client_event_id'])->first();
            if ($existing) {
                return ['log' => $existing, 'idempotent_replay' => true];
            }
            $this->applyStreakFreeze->handle($user, $localDate);
            $goal = $this->goals->forDate($user, $localDate);
            $goalMl = $goal?->daily_goal_ml ?? 2000;
            $stat = DailyUserStat::query()
                ->where('user_id', $user->id)
                ->whereDate('local_date', $localDate)
                ->lockForUpdate()
                ->first();

            $beforeTotal = $stat?->total_ml ?? 0;
            $beforeCount = $stat?->log_count ?? 0;
            $recordXpBefore = $stat?->record_xp_earned ?? 0;
            $baseXp = $beforeCount === 0 ? 10 : 5;
            $recordXp = min($baseXp, max(0, self::DAILY_RECORD_XP_CAP - $recordXpBefore));
            $afterTotal = $beforeTotal + $input['amount_ml'];
            $goalBonus = $beforeTotal < $goalMl && $afterTotal >= $goalMl ? 25 : 0;
            $multiplier = $stat?->xp_multiplier ?? $this->xp->percentageForDate($user, $localDate);
            $xpAwarded = $this->xp->multiply($recordXpBefore + $recordXp, $multiplier)
                - $this->xp->multiply($recordXpBefore, $multiplier)
                + $this->xp->multiply($goalBonus, $multiplier);

            $log = HydrationLog::query()->create([
                'user_id' => $user->id,
                'amount_ml' => $input['amount_ml'],
                'occurred_at' => $occurredAt,
                'local_date' => $localDate,
                'timezone_at_event' => $timezone,
                'source' => $input['source'],
                'client_event_id' => $input['client_event_id'],
                'xp_awarded' => $xpAwarded,
                'xp_multiplier' => $multiplier,
                'metadata' => $input['metadata'] ?? null,
            ]);

            $stat ??= new DailyUserStat(['user_id' => $user->id, 'local_date' => $localDate]);
            $stat->fill([
                'total_ml' => $afterTotal,
                'goal_ml_snapshot' => $stat->exists ? $stat->goal_ml_snapshot : $goalMl,
                'goal_achieved_at' => $stat->goal_achieved_at ?? ($goalBonus > 0 ? now() : null),
                'xp_earned' => ($stat->xp_earned ?? 0) + $xpAwarded,
                'xp_multiplier' => $multiplier,
                'record_xp_earned' => $recordXpBefore + $recordXp,
                'log_count' => $beforeCount + 1,
            ]);
            $stat->save();

            $user->increment('xp_total', $xpAwarded);
            $this->levels->snapshot($user);

            OutboxEvent::query()->create([
                'type' => 'hydration.log.created.v1',
                'aggregate_id' => $log->id,
                'payload' => [
                    'user_id' => $user->id,
                    'log_id' => $log->id,
                    'local_date' => $localDate,
                ],
                'available_at' => now(),
            ]);

            return ['log' => $log, 'idempotent_replay' => false];
        });

        if ($result['idempotent_replay']) {
            $this->applyStreakFreeze->handle($user, $result['log']->local_date->toDateString());
        }
        $this->streaks->recalculate($user);

        $result['new_achievements'] = $this->achievements->reconcile($user);

        return $result;
    }
}
