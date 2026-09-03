<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;

class InventoryQuery
{
    /**
     * @return array<string, mixed>
     */
    public function forUser(User $user): array
    {
        $balances = InventoryBalance::query()
            ->whereBelongsTo($user)
            ->get()
            ->keyBy(fn (InventoryBalance $balance): string => $balance->item_code->value);

        $items = array_map(function (InventoryItemCode $itemCode) use ($balances): array {
            $balance = $balances->get($itemCode->value);
            $quantity = $balance?->quantity ?? 0;
            $reservedQuantity = $balance?->reserved_quantity ?? 0;

            return [
                'code' => $itemCode->value,
                'quantity' => $quantity,
                'reserved_quantity' => $reservedQuantity,
                'available_quantity' => $quantity - $reservedQuantity,
            ];
        }, InventoryItemCode::cases());

        $activeFreeze = StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('active_key', 'hydration')
            ->where('status', StreakPotionEffectStatus::Armed->value)
            ->first();
        $blockedByGroupChallenge = PotionUsageBlock::isActiveFor($user, now());

        return [
            'items' => $items,
            'usage' => [
                'blocked_by_group_challenge' => $blockedByGroupChallenge,
                'hydration_freeze' => $activeFreeze ? [
                    'id' => $activeFreeze->id,
                    'status' => $blockedByGroupChallenge ? 'suspended' : 'armed',
                    'eligible_from' => $activeFreeze->eligible_from?->toDateString(),
                    'created_at' => $activeFreeze->created_at->toIso8601String(),
                ] : null,
            ],
        ];
    }
}
