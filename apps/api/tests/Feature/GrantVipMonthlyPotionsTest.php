<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Inventory\Application\GrantVipMonthlyPotions;
use App\Modules\Inventory\Domain\PotionUseException;
use App\Modules\Inventory\Domain\ProEntitlementStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class GrantVipMonthlyPotionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_pro_receives_one_of_each_potion_only_once_per_month(): void
    {
        $user = User::factory()->create();
        $grant = app(GrantVipMonthlyPotions::class);

        $first = $grant->handle($user, '2026-09', ProEntitlementStatus::ProActive);
        $replay = $grant->handle($user, '2026-09', ProEntitlementStatus::ProActive);

        $this->assertFalse($first['idempotent_replay']);
        $this->assertTrue($replay['idempotent_replay']);
        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity' => 1,
        ]);
        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_revive',
            'quantity' => 1,
        ]);
        $this->assertDatabaseCount('inventory_transactions', 2);
    }

    public function test_grace_period_does_not_receive_the_monthly_quota(): void
    {
        $user = User::factory()->create();

        try {
            app(GrantVipMonthlyPotions::class)->handle(
                $user,
                '2026-09',
                ProEntitlementStatus::GracePeriod,
            );
            $this->fail('Expected a grace-period entitlement to be rejected.');
        } catch (PotionUseException $exception) {
            $this->assertSame('VIP_MONTHLY_GRANT_NOT_ELIGIBLE', $exception->errorCode);
        }

        $this->assertDatabaseCount('inventory_balances', 0);
        $this->assertDatabaseCount('inventory_transactions', 0);
    }

    public function test_invalid_period_does_not_receive_the_monthly_quota(): void
    {
        $user = User::factory()->create();

        $this->expectException(InvalidArgumentException::class);

        app(GrantVipMonthlyPotions::class)->handle(
            $user,
            '09-2026',
            ProEntitlementStatus::ProActive,
        );
    }
}
