<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Gamification\Application\StreakCalculator;
use App\Modules\Inventory\Application\ApplyArmedHydrationStreakFreeze;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class ApplyHydrationStreakFreezes extends Command
{
    protected $signature = 'hydration:apply-streak-freezes';

    protected $description = 'Apply armed hydration protection to closed missed days in each profile timezone';

    public function handle(ApplyArmedHydrationStreakFreeze $freezes, StreakCalculator $streaks): int
    {
        User::query()->with('profile')->whereHas('profile')
            ->whereIn('id', StreakPotionEffect::query()->select('user_id')
                ->where('active_key', 'hydration')
                ->where('status', StreakPotionEffectStatus::Armed->value))
            ->chunkById(100, function ($users) use ($freezes, $streaks): void {
                foreach ($users as $user) {
                    if ($freezes->handle($user, CarbonImmutable::now($user->profile->timezone)->toDateString())) {
                        $streaks->recalculate($user);
                    }
                }
            });

        return self::SUCCESS;
    }
}
