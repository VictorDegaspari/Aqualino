<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\PotionUseException;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Illuminate\Support\Facades\DB;

class ReleaseHydrationStreakFreeze
{
    /**
     * @return array{effect: StreakPotionEffect, idempotent_replay: bool}
     */
    public function handle(User $user, string $effectId): array
    {
        return DB::transaction(function () use ($user, $effectId): array {
            $effect = StreakPotionEffect::query()
                ->whereBelongsTo($user)
                ->whereKey($effectId)
                ->lockForUpdate()
                ->first();

            if (! $effect) {
                throw PotionUseException::effectNotFound();
            }

            if ($effect->status === StreakPotionEffectStatus::Released) {
                return ['effect' => $effect, 'idempotent_replay' => true];
            }

            if ($effect->status === StreakPotionEffectStatus::Consumed) {
                throw PotionUseException::alreadyConsumed();
            }

            $balance = InventoryBalance::query()
                ->whereBelongsTo($user)
                ->where('item_code', InventoryItemCode::StreakFreeze->value)
                ->lockForUpdate()
                ->firstOrFail();

            $balance->update([
                'reserved_quantity' => max(0, $balance->reserved_quantity - 1),
            ]);
            $effect->update([
                'status' => StreakPotionEffectStatus::Released,
                'active_key' => null,
                'released_at' => now(),
            ]);

            return ['effect' => $effect->refresh(), 'idempotent_replay' => false];
        }, attempts: 3);
    }
}
