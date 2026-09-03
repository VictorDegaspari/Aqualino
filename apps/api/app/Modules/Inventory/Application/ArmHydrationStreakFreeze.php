<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\PotionUseException;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ArmHydrationStreakFreeze
{
    /**
     * @return array{effect: StreakPotionEffect, idempotent_replay: bool}
     */
    public function handle(User $user, string $clientActionId): array
    {
        $existingEffect = $this->findByClientAction($user, $clientActionId);

        if ($existingEffect) {
            if ($existingEffect->item_code !== InventoryItemCode::StreakFreeze) {
                throw PotionUseException::idempotencyKeyReused();
            }

            return ['effect' => $existingEffect, 'idempotent_replay' => true];
        }

        if (PotionUsageBlock::isActiveFor($user, now())) {
            throw PotionUseException::blockedByGroupChallenge();
        }

        return DB::transaction(function () use ($user, $clientActionId): array {
            $existingEffect = $this->findByClientAction($user, $clientActionId);

            if ($existingEffect) {
                if ($existingEffect->item_code !== InventoryItemCode::StreakFreeze) {
                    throw PotionUseException::idempotencyKeyReused();
                }

                return ['effect' => $existingEffect, 'idempotent_replay' => true];
            }

            if (PotionUsageBlock::isActiveFor($user, now())) {
                throw PotionUseException::blockedByGroupChallenge();
            }

            $balance = InventoryBalance::query()->firstOrCreate(
                ['user_id' => $user->id, 'item_code' => InventoryItemCode::StreakFreeze->value],
                ['quantity' => 0, 'reserved_quantity' => 0],
            );
            $balance = InventoryBalance::query()->whereKey($balance->id)->lockForUpdate()->firstOrFail();

            $activeEffect = StreakPotionEffect::query()
                ->whereBelongsTo($user)
                ->where('active_key', 'hydration')
                ->lockForUpdate()
                ->first();

            if ($activeEffect) {
                throw PotionUseException::alreadyArmed();
            }

            if (($balance->quantity - $balance->reserved_quantity) < 1) {
                throw PotionUseException::unavailable();
            }

            $timezone = $user->profile?->timezone ?? 'UTC';
            $effect = StreakPotionEffect::query()->create([
                'user_id' => $user->id,
                'item_code' => InventoryItemCode::StreakFreeze,
                'scope_type' => 'hydration',
                'scope_key' => 'hydration',
                'client_action_id' => $clientActionId,
                'status' => StreakPotionEffectStatus::Armed,
                'active_key' => 'hydration',
                'eligible_from' => CarbonImmutable::now($timezone)->toDateString(),
            ]);

            $balance->increment('reserved_quantity');

            return ['effect' => $effect, 'idempotent_replay' => false];
        }, attempts: 3);
    }

    private function findByClientAction(User $user, string $clientActionId): ?StreakPotionEffect
    {
        return StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('client_action_id', $clientActionId)
            ->first();
    }
}
