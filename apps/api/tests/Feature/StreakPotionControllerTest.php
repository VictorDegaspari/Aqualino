<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use App\Modules\Inventory\Application\CreditInventoryItem;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StreakPotionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_when_arming_a_freeze_without_a_token(): void
    {
        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => '8bfb119a-5a7c-49d8-9f89-56656901a4fc',
        ])->assertUnauthorized()->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_returns_422_when_client_action_id_is_invalid(): void
    {
        $this->authenticatedUser();

        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => 'not-a-uuid',
        ])->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');

        $this->assertDatabaseCount('streak_potion_effects', 0);
    }

    public function test_arming_a_freeze_reserves_one_unit_and_replays_idempotently(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T15:00:00Z'));
        $user = $this->authenticatedUser();
        $this->credit($user, InventoryItemCode::StreakFreeze, 2);
        $payload = ['client_action_id' => 'd82bcab2-7eca-4d6c-a2cc-0aa0e427a289'];

        $this->postJson('/api/v1/inventory/streak-freezes', $payload)
            ->assertCreated()
            ->assertJsonPath('data.effect.status', 'armed')
            ->assertJsonPath('data.effect.eligible_from', '2026-09-02')
            ->assertJsonPath('data.inventory.items.0.quantity', 2)
            ->assertJsonPath('data.inventory.items.0.reserved_quantity', 1)
            ->assertJsonPath('data.inventory.items.0.available_quantity', 1)
            ->assertJsonPath('data.idempotent_replay', false);

        $this->postJson('/api/v1/inventory/streak-freezes', $payload)
            ->assertOk()
            ->assertJsonPath('data.idempotent_replay', true);

        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => '42e61775-5df3-46a4-b822-818a7e1c95ce',
        ])->assertConflict()->assertJsonPath('error.code', 'STREAK_FREEZE_ALREADY_ARMED');

        $this->assertDatabaseCount('streak_potion_effects', 1);
        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity' => 2,
            'reserved_quantity' => 1,
        ]);
    }

    public function test_releasing_an_armed_freeze_restores_availability_without_consuming_it(): void
    {
        $user = $this->authenticatedUser();
        $this->credit($user, InventoryItemCode::StreakFreeze);
        $effectId = $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => 'b3d6262f-45bc-4806-8517-416833f44511',
        ])->json('data.effect.id');

        $this->deleteJson("/api/v1/inventory/streak-freezes/{$effectId}")
            ->assertOk()
            ->assertJsonPath('data.effect.status', 'released')
            ->assertJsonPath('data.inventory.items.0.quantity', 1)
            ->assertJsonPath('data.inventory.items.0.reserved_quantity', 0)
            ->assertJsonPath('data.inventory.items.0.available_quantity', 1);

        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    public function test_returns_404_when_releasing_another_users_freeze(): void
    {
        $owner = $this->user();
        $attacker = $this->authenticatedUser();
        $effect = StreakPotionEffect::factory()->for($owner)->create();

        $this->deleteJson("/api/v1/inventory/streak-freezes/{$effect->id}")
            ->assertNotFound()
            ->assertJsonPath('error.code', 'RESOURCE_NOT_FOUND');

        $this->assertDatabaseHas('streak_potion_effects', [
            'id' => $effect->id,
            'status' => 'armed',
            'user_id' => $owner->id,
        ]);
        $this->assertNotSame($owner->id, $attacker->id);
    }

    public function test_armed_freeze_is_consumed_by_the_next_eligible_missed_day(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T13:00:00Z'));
        $user = $this->authenticatedUser();
        $this->dailyHydration($user, '2026-09-01');
        $this->credit($user, InventoryItemCode::StreakFreeze);
        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => '5af20f22-7235-4f20-818c-95d279ff1afe',
        ])->assertCreated();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T13:00:00Z'));

        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 300,
            'client_event_id' => '339426aa-f5c8-48fc-ad41-6b25117ba29e',
        ])->assertCreated()->assertJsonPath('data.gamification.streak', 3);

        $this->assertDatabaseHas('streak_potion_effects', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'status' => 'consumed',
        ]);
        $consumedEffect = StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('item_code', InventoryItemCode::StreakFreeze->value)
            ->firstOrFail();
        $this->assertSame('2026-09-02', $consumedEffect->target_local_date->toDateString());
        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity' => 0,
            'reserved_quantity' => 0,
        ]);
        $this->assertDatabaseHas('inventory_transactions', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity_delta' => -1,
            'source_type' => 'potion_use',
        ]);
    }

    public function test_revival_recovers_a_single_break_within_48_hours(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-03T13:00:00Z'));
        $user = $this->authenticatedUser();
        $this->dailyHydration($user, '2026-09-01');
        $this->dailyHydration($user, '2026-09-03');
        $this->credit($user, InventoryItemCode::StreakRevive);

        $payload = [
            'client_action_id' => 'be759b55-d3d3-45e9-a234-a2364fbf2a46',
        ];
        $this->postJson('/api/v1/inventory/streak-revivals', $payload)
            ->assertCreated()
            ->assertJsonPath('data.effect.status', 'consumed')
            ->assertJsonPath('data.effect.target_local_date', '2026-09-02')
            ->assertJsonPath('data.inventory.items.1.quantity', 0)
            ->assertJsonPath('data.streak', 3);
        $this->postJson('/api/v1/inventory/streak-revivals', $payload)
            ->assertOk()
            ->assertJsonPath('data.idempotent_replay', true)
            ->assertJsonPath('data.inventory.items.1.quantity', 0);

        $this->assertDatabaseHas('inventory_transactions', [
            'user_id' => $user->id,
            'item_code' => 'streak_revive',
            'quantity_delta' => -1,
            'source_type' => 'potion_use',
        ]);
    }

    public function test_group_challenge_blocks_usage_and_suspends_an_armed_freeze(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-03T13:00:00Z'));
        $user = $this->authenticatedUser();
        $this->credit($user, InventoryItemCode::StreakFreeze, 2);
        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => '966e6944-eaa6-45ef-a10c-0f143a2a9d69',
        ])->assertCreated();
        PotionUsageBlock::factory()->for($user)->create([
            'starts_at' => '2026-09-03T00:00:00Z',
            'ends_at' => '2026-09-09T23:59:59Z',
        ]);

        $this->getJson('/api/v1/inventory')
            ->assertOk()
            ->assertJsonPath('data.usage.blocked_by_group_challenge', true)
            ->assertJsonPath('data.usage.hydration_freeze.status', 'suspended');

        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => '445bd1eb-2004-4aad-b630-c7414fb6be5d',
        ])->assertConflict()->assertJsonPath('error.code', 'POTION_USAGE_BLOCKED_BY_GROUP_CHALLENGE');

        $this->postJson('/api/v1/inventory/streak-revivals', [
            'client_action_id' => '91300f3f-da18-4df0-94c3-bd2208dbf7a0',
        ])->assertConflict()->assertJsonPath('error.code', 'POTION_USAGE_BLOCKED_BY_GROUP_CHALLENGE');

        $this->travelTo(CarbonImmutable::parse('2026-09-04T13:00:00Z'));
        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 300,
            'client_event_id' => 'a014df3e-7f81-42bc-a607-1446dc6b76aa',
        ])->assertCreated();

        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_freeze',
            'quantity' => 2,
            'reserved_quantity' => 1,
        ]);

        $this->travelTo(CarbonImmutable::parse('2026-09-10T13:00:00Z'));
        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 300,
            'client_event_id' => '80cc6c91-b601-4a0c-9704-cbd5f19c257c',
        ])->assertCreated();
        $this->assertDatabaseMissing('streak_potion_effects', [
            'user_id' => $user->id,
            'status' => 'consumed',
        ]);

        $this->travelTo(CarbonImmutable::parse('2026-09-12T13:00:00Z'));
        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 300,
            'client_event_id' => '69eefc6d-7a27-48e5-8e35-a9f13228d93e',
        ])->assertCreated()->assertJsonPath('data.gamification.streak', 3);
        $consumedEffect = StreakPotionEffect::query()
            ->whereBelongsTo($user)
            ->where('status', 'consumed')
            ->firstOrFail();
        $this->assertSame('2026-09-11', $consumedEffect->target_local_date->toDateString());
    }

    public function test_revival_without_a_recoverable_break_does_not_consume_inventory(): void
    {
        $user = $this->authenticatedUser();
        $this->credit($user, InventoryItemCode::StreakRevive);

        $this->postJson('/api/v1/inventory/streak-revivals', [
            'client_action_id' => '24412221-c485-4798-939b-871369593a6c',
        ])->assertConflict()->assertJsonPath('error.code', 'NO_RECOVERABLE_STREAK_BREAK');

        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_revive',
            'quantity' => 1,
        ]);
        $this->assertDatabaseCount('streak_potion_effects', 0);
    }

    public function test_revival_rejects_a_break_after_the_48_hour_window(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-05T13:00:00Z'));
        $user = $this->authenticatedUser();
        $this->dailyHydration($user, '2026-09-01');
        $this->dailyHydration($user, '2026-09-03');
        $this->dailyHydration($user, '2026-09-04');
        $this->dailyHydration($user, '2026-09-05');
        $this->credit($user, InventoryItemCode::StreakRevive);

        $this->postJson('/api/v1/inventory/streak-revivals', [
            'client_action_id' => '925ced17-23d0-46ed-a024-2237ab12e360',
        ])->assertConflict()->assertJsonPath('error.code', 'NO_RECOVERABLE_STREAK_BREAK');

        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_revive',
            'quantity' => 1,
        ]);
    }

    public function test_rejects_an_idempotency_key_reused_for_another_potion_action(): void
    {
        $user = $this->authenticatedUser();
        $this->credit($user, InventoryItemCode::StreakFreeze);
        $this->credit($user, InventoryItemCode::StreakRevive);
        $clientActionId = 'ce3198a4-a1c1-46e0-a815-23ec62965784';
        $this->postJson('/api/v1/inventory/streak-freezes', [
            'client_action_id' => $clientActionId,
        ])->assertCreated();

        $this->postJson('/api/v1/inventory/streak-revivals', [
            'client_action_id' => $clientActionId,
        ])->assertConflict()->assertJsonPath('error.code', 'IDEMPOTENCY_KEY_REUSED');

        $this->assertDatabaseHas('inventory_balances', [
            'user_id' => $user->id,
            'item_code' => 'streak_revive',
            'quantity' => 1,
        ]);
        $this->assertDatabaseCount('streak_potion_effects', 1);
    }

    private function authenticatedUser(): User
    {
        $user = $this->user();
        Sanctum::actingAs($user, ['mobile']);

        return $user;
    }

    private function user(): User
    {
        $user = User::factory()->create();
        UserProfile::query()->create([
            'user_id' => $user->id,
            'display_name' => 'Pessoa Teste',
            'username' => 'u_'.strtolower(substr($user->id, -20)),
            'timezone' => 'UTC',
            'locale' => 'pt-BR',
            'favorite_volumes_ml' => [200, 300, 500],
        ]);
        HydrationGoal::query()->create([
            'user_id' => $user->id,
            'daily_goal_ml' => 2000,
            'starts_on' => '2020-01-01',
            'source' => 'test',
        ]);

        return $user->load('profile');
    }

    private function credit(User $user, InventoryItemCode $itemCode, int $quantity = 1): void
    {
        app(CreditInventoryItem::class)->handle(
            $user,
            $itemCode,
            $quantity,
            InventoryTransactionSource::StorePurchase,
            'purchase-'.$itemCode->value.'-'.$user->id,
        );
    }

    private function dailyHydration(User $user, string $localDate): void
    {
        DailyUserStat::query()->create([
            'user_id' => $user->id,
            'local_date' => $localDate,
            'total_ml' => 300,
            'goal_ml_snapshot' => 2000,
            'xp_earned' => 10,
            'record_xp_earned' => 10,
            'log_count' => 1,
        ]);
    }
}
