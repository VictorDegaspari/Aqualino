<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Inventory\Application\CreditInventoryItem;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CreditInventoryItemTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_increases_the_balance_and_writes_an_auditable_transaction(): void
    {
        $user = User::factory()->create();

        $result = app(CreditInventoryItem::class)->handle(
            $user,
            InventoryItemCode::StreakFreeze,
            2,
            InventoryTransactionSource::StorePurchase,
            'store-transaction-123',
            ['platform' => 'android'],
        );

        $this->assertFalse($result['idempotent_replay']);
        $this->assertSame(2, $result['balance']->quantity);
        $this->assertSame(0, $result['balance']->reserved_quantity);
        $this->assertSame(['platform' => 'android'], $result['transaction']->metadata);
        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity' => 2,
            'reserved_quantity' => 0,
        ]);
        $this->assertDatabaseHas('inventory_transactions', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity_delta' => 2,
            'source_type' => 'store_purchase',
            'source_id' => 'store-transaction-123',
        ]);
    }

    public function test_repeated_source_credits_the_inventory_only_once(): void
    {
        $user = User::factory()->create();
        $credit = app(CreditInventoryItem::class);
        $first = $credit->handle(
            $user,
            InventoryItemCode::StreakRevive,
            1,
            InventoryTransactionSource::VipMonthlyGrant,
            '2026-09',
        );

        $replayed = $credit->handle(
            $user,
            InventoryItemCode::StreakRevive,
            1,
            InventoryTransactionSource::VipMonthlyGrant,
            '2026-09',
        );

        $this->assertFalse($first['idempotent_replay']);
        $this->assertTrue($replayed['idempotent_replay']);
        $this->assertSame($first['transaction']->id, $replayed['transaction']->id);
        $this->assertSame(1, $replayed['balance']->quantity);
        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    #[DataProvider('invalidCredits')]
    public function test_rejects_invalid_credit_without_changing_inventory(int $quantity, string $sourceId): void
    {
        $user = User::factory()->create();

        try {
            app(CreditInventoryItem::class)->handle(
                $user,
                InventoryItemCode::StreakFreeze,
                $quantity,
                InventoryTransactionSource::StorePurchase,
                $sourceId,
            );
            $this->fail('Expected an invalid inventory credit to be rejected.');
        } catch (InvalidArgumentException) {
            $this->assertDatabaseCount('inventory_balances', 0);
            $this->assertDatabaseCount('inventory_transactions', 0);
        }
    }

    /**
     * @return array<string, array{int, string}>
     */
    public static function invalidCredits(): array
    {
        return [
            'zero quantity' => [0, 'source-1'],
            'negative quantity' => [-1, 'source-2'],
            'empty source ID' => [1, ''],
            'source ID over 100 characters' => [1, str_repeat('a', 101)],
        ];
    }
}
