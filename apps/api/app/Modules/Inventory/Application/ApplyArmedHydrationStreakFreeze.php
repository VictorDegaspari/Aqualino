<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\InventoryTransaction;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use LogicException;

class ApplyArmedHydrationStreakFreeze
{
    public function handle(User $user, string $currentLocalDate): ?StreakPotionEffect
    {
        if (PotionUsageBlock::isActiveFor($user, now())) {
            return null;
        }

        return DB::transaction(function () use ($user, $currentLocalDate): ?StreakPotionEffect {
            $effect = StreakPotionEffect::query()
                ->whereBelongsTo($user)
                ->where('active_key', 'hydration')
                ->where('status', StreakPotionEffectStatus::Armed->value)
                ->lockForUpdate()
                ->first();

            if (! $effect || PotionUsageBlock::isActiveFor($user, now())) {
                return null;
            }

            $timezone = $user->profile?->timezone ?? 'UTC';
            $targetDate = $this->nextEligibleMissedDate($user, $effect, $currentLocalDate, $timezone);

            if (! $targetDate) {
                return null;
            }

            $balance = InventoryBalance::query()
                ->whereBelongsTo($user)
                ->where('item_code', InventoryItemCode::StreakFreeze->value)
                ->lockForUpdate()
                ->firstOrFail();

            if ($balance->quantity < 1 || $balance->reserved_quantity < 1) {
                throw new LogicException('An armed streak freeze must have one reserved inventory unit.');
            }

            $effect->update([
                'status' => StreakPotionEffectStatus::Consumed,
                'active_key' => null,
                'target_local_date' => $targetDate,
                'consumed_at' => now(),
            ]);
            $balance->update([
                'quantity' => $balance->quantity - 1,
                'reserved_quantity' => $balance->reserved_quantity - 1,
            ]);
            InventoryTransaction::query()->create([
                'user_id' => $user->id,
                'item_code' => InventoryItemCode::StreakFreeze,
                'quantity_delta' => -1,
                'source_type' => InventoryTransactionSource::PotionUse,
                'source_id' => $effect->id,
                'metadata' => [
                    'scope_type' => 'hydration',
                    'target_local_date' => $targetDate,
                ],
            ]);

            return $effect->refresh();
        }, attempts: 3);
    }

    private function nextEligibleMissedDate(
        User $user,
        StreakPotionEffect $effect,
        string $currentLocalDate,
        string $timezone,
    ): ?string {
        $eligibleFrom = CarbonImmutable::parse($effect->eligible_from->toDateString(), $timezone)->startOfDay();
        $currentDate = CarbonImmutable::parse($currentLocalDate, $timezone)->startOfDay();

        if (! $eligibleFrom->isBefore($currentDate)) {
            return null;
        }

        $hydratedDates = DailyUserStat::query()
            ->where('user_id', $user->id)
            ->where('total_ml', '>=', 50)
            ->whereBetween('local_date', [$eligibleFrom->subDay()->toDateString(), $currentDate->toDateString()])
            ->pluck('local_date')
            ->mapWithKeys(fn ($date): array => [
                CarbonImmutable::parse((string) $date, $timezone)->toDateString() => true,
            ]);

        StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('scope_type', 'hydration')
            ->where('status', StreakPotionEffectStatus::Consumed->value)
            ->whereNotNull('target_local_date')
            ->pluck('target_local_date')
            ->each(function ($date) use ($hydratedDates, $timezone): void {
                $hydratedDates->put(
                    CarbonImmutable::parse((string) $date, $timezone)->toDateString(),
                    true,
                );
            });

        for ($cursor = $eligibleFrom; $cursor->isBefore($currentDate); $cursor = $cursor->addDay()) {
            $date = $cursor->toDateString();

            if ($hydratedDates->has($date)) {
                continue;
            }

            if (PotionUsageBlock::overlapsLocalDate($user, $cursor, $timezone)) {
                continue;
            }

            if ($hydratedDates->has($cursor->subDay()->toDateString())) {
                return $date;
            }
        }

        return null;
    }
}
