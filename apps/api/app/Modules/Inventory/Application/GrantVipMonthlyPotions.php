<?php

namespace App\Modules\Inventory\Application;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Domain\PotionUseException;
use App\Modules\Inventory\Domain\ProEntitlementStatus;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class GrantVipMonthlyPotions
{
    public function __construct(private readonly CreditInventoryItem $creditInventoryItem) {}

    /**
     * @return array{period: string, idempotent_replay: bool}
     */
    public function handle(User $user, string $period, ProEntitlementStatus $entitlementStatus): array
    {
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period)) {
            throw new InvalidArgumentException('VIP grant period must use the YYYY-MM format.');
        }

        if ($entitlementStatus !== ProEntitlementStatus::ProActive) {
            throw PotionUseException::proGrantUnavailable();
        }

        return DB::transaction(function () use ($user, $period, $entitlementStatus): array {
            $results = [];

            foreach (InventoryItemCode::cases() as $itemCode) {
                $results[] = $this->creditInventoryItem->handle(
                    $user,
                    $itemCode,
                    1,
                    InventoryTransactionSource::VipMonthlyGrant,
                    $period,
                    ['entitlement_status' => $entitlementStatus->value],
                );
            }

            return [
                'period' => $period,
                'idempotent_replay' => collect($results)->every(
                    fn (array $result): bool => $result['idempotent_replay'],
                ),
            ];
        }, attempts: 3);
    }
}
