<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class HydrationRecordLimits
{
    public const DAILY_LIMIT = 15;

    public const INTERVAL_SECONDS = 900;

    public const SYNC_WINDOW_HOURS = 24;

    public function assertCanRecord(User $user, CarbonImmutable $occurredAt): void
    {
        $day = $occurredAt->setTimezone($user->profile->timezone)->startOfDay();
        $count = HydrationLog::withTrashed()->where('user_id', $user->id)
            ->where('occurred_at', '>=', $day->utc())->where('occurred_at', '<', $day->addDay()->utc())->count();
        if ($count >= self::DAILY_LIMIT) {
            throw ValidationException::withMessages(['recording' => ['Você atingiu o limite de 15 marcações neste dia. Novos registros estarão disponíveis no próximo dia.']]);
        }
        $tooClose = HydrationLog::withTrashed()->where('user_id', $user->id)
            ->where('occurred_at', '>', $occurredAt->subSeconds(self::INTERVAL_SECONDS))
            ->where('occurred_at', '<', $occurredAt->addSeconds(self::INTERVAL_SECONDS))->exists();
        if ($tooClose) {
            throw ValidationException::withMessages(['recording' => ['Aguarde 15 minutos entre marcações de água.']]);
        }
    }

    public function forUser(User $user): array
    {
        $now = CarbonImmutable::now('UTC');
        $day = $now->setTimezone($user->profile->timezone)->startOfDay();
        $query = HydrationLog::withTrashed()->where('user_id', $user->id);
        $count = (clone $query)->where('occurred_at', '>=', $day->utc())->where('occurred_at', '<', $day->addDay()->utc())->count();
        $last = $query->latest('occurred_at')->first(['occurred_at']);
        $next = $last?->occurred_at->addSeconds(self::INTERVAL_SECONDS);
        if ($count >= self::DAILY_LIMIT && (! $next || $next->lessThan($day->addDay()))) {
            $next = $day->addDay()->utc();
        }

        return [
            'daily_limit' => self::DAILY_LIMIT, 'minimum_interval_seconds' => self::INTERVAL_SECONDS,
            'recorded_today' => $count, 'remaining_today' => max(0, self::DAILY_LIMIT - $count),
            'next_allowed_at' => $next?->greaterThan($now) ? $next->utc()->toIso8601String() : null,
            'server_now' => $now->toIso8601String(),
        ];
    }
}
