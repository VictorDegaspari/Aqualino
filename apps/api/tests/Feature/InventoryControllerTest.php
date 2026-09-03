<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Inventory\Application\CreditInventoryItem;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_when_no_token_is_provided(): void
    {
        $this->get('/api/v1/inventory')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED')
            ->assertHeader('X-Request-ID');
    }

    public function test_returns_both_items_with_zero_balance_for_a_new_user(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['mobile']);

        $response = $this->getJson('/api/v1/inventory');

        $response->assertOk()->assertExactJson([
            'data' => [
                'items' => [
                    [
                        'code' => 'streak_freeze',
                        'quantity' => 0,
                        'reserved_quantity' => 0,
                        'available_quantity' => 0,
                    ],
                    [
                        'code' => 'streak_revive',
                        'quantity' => 0,
                        'reserved_quantity' => 0,
                        'available_quantity' => 0,
                    ],
                ],
                'usage' => [
                    'blocked_by_group_challenge' => false,
                    'hydration_freeze' => null,
                ],
            ],
        ]);
        $this->assertDatabaseCount('inventory_balances', 0);
    }

    public function test_returns_only_the_authenticated_users_inventory(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $credit = app(CreditInventoryItem::class);
        $credit->handle(
            $user,
            InventoryItemCode::StreakFreeze,
            2,
            InventoryTransactionSource::StorePurchase,
            'purchase-user-freeze',
        );
        $credit->handle(
            $otherUser,
            InventoryItemCode::StreakFreeze,
            9,
            InventoryTransactionSource::StorePurchase,
            'purchase-other-user-freeze',
        );
        $credit->handle(
            $otherUser,
            InventoryItemCode::StreakRevive,
            7,
            InventoryTransactionSource::StorePurchase,
            'purchase-other-user-revive',
        );
        Sanctum::actingAs($user, ['mobile']);

        $response = $this->getJson('/api/v1/inventory');

        $response
            ->assertOk()
            ->assertJsonPath('data.items.0.code', 'streak_freeze')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.available_quantity', 2)
            ->assertJsonPath('data.items.1.code', 'streak_revive')
            ->assertJsonPath('data.items.1.quantity', 0);
    }
}
