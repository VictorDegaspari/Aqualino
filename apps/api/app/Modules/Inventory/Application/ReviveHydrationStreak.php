<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Gamification\Application\StreakCalculator;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Domain\PotionUseException;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\InventoryTransaction;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ReviveHydrationStreak
{
    public function __construct(private readonly StreakCalculator $streaks) {}

    /**
     * @return array{effect: StreakPotionEffect, idempotent_replay: bool, streak: int}
     */
    public function handle(User $user, string $clientActionId): array
    {
        $existingEffect = $this->findByClientAction($user, $clientActionId);

        if ($existingEffect) {
            if ($existingEffect->item_code !== InventoryItemCode::StreakRevive) {
                throw PotionUseException::idempotencyKeyReused();
            }

            $streak = $this->streaks->recalculate($user);

            return ['effect' => $existingEffect, 'idempotent_replay' => true, 'streak' => $streak->current_streak];
        }

        if (PotionUsageBlock::isActiveFor($user, now())) {
            throw PotionUseException::blockedByGroupChallenge();
        }

        $effect = DB::transaction(function () use ($user, $clientActionId): StreakPotionEffect {
            $existingEffect = $this->findByClientAction($user, $clientActionId);

            if ($existingEffect) {
                if ($existingEffect->item_code !== InventoryItemCode::StreakRevive) {
                    throw PotionUseException::idempotencyKeyReused();
                }

                return $existingEffect;
            }

            if (PotionUsageBlock::isActiveFor($user, now())) {
                throw PotionUseException::blockedByGroupChallenge();
            }

            $balance = InventoryBalance::query()->firstOrCreate(
                ['user_id' => $user->id, 'item_code' => InventoryItemCode::StreakRevive->value],
                ['quantity' => 0, 'reserved_quantity' => 0],
            );
            $balance = InventoryBalance::query()->whereKey($balance->id)->lockForUpdate()->firstOrFail();

            if (($balance->quantity - $balance->reserved_quantity) < 1) {
                throw PotionUseException::unavailable();
            }

            $timezone = $user->profile?->timezone ?? 'UTC';
            $targetDate = $this->recoverableDate($user, $timezone);

            if (! $targetDate) {
                throw PotionUseException::noRecoverableBreak();
            }

            $effect = StreakPotionEffect::query()->create([
                'user_id' => $user->id,
                'item_code' => InventoryItemCode::StreakRevive,
                'scope_type' => 'hydration',
                'scope_key' => 'hydration',
                'client_action_id' => $clientActionId,
                'status' => StreakPotionEffectStatus::Consumed,
                'target_local_date' => $targetDate,
                'consumed_at' => now(),
            ]);
            $balance->update(['quantity' => $balance->quantity - 1]);
            InventoryTransaction::query()->create([
                'user_id' => $user->id,
                'item_code' => InventoryItemCode::StreakRevive,
                'quantity_delta' => -1,
                'source_type' => InventoryTransactionSource::PotionUse,
                'source_id' => $effect->id,
                'metadata' => [
                    'scope_type' => 'hydration',
                    'target_local_date' => $targetDate,
                ],
            ]);

            return $effect;
        }, attempts: 3);

        $streak = $this->streaks->recalculate($user);

        return ['effect' => $effect, 'idempotent_replay' => false, 'streak' => $streak->current_streak];
    }

    private function findByClientAction(User $user, string $clientActionId): ?StreakPotionEffect
    {
        return StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('client_action_id', $clientActionId)
            ->first();
    }

    private function recoverableDate(User $user, string $timezone): ?string
    {
        $now = CarbonImmutable::now($timezone);
        $today = $now->startOfDay();
        $oldestCandidate = $now->subHours(48)->startOfDay();
        $hydratedDates = DailyUserStat::query()
            ->where('user_id', $user->id)
            ->where('total_ml', '>=', 50)
            ->whereBetween('local_date', [$oldestCandidate->subDay()->toDateString(), $today->toDateString()])
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

        for ($cursor = $today->subDay(); $cursor->greaterThanOrEqualTo($oldestCandidate); $cursor = $cursor->subDay()) {
            $date = $cursor->toDateString();

            if ($hydratedDates->has($date)) {
                continue;
            }

            $deadline = $cursor->endOfDay()->addHours(48);

            if ($now->isAfter($deadline)
                || PotionUsageBlock::overlapsLocalDate($user, $cursor, $timezone)
                || ! $hydratedDates->has($cursor->subDay()->toDateString())) {
                return null;
            }

            return $date;
        }

        return null;
    }
}
