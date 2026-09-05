<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class HydrationXpMultiplierTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith([0, 1, 10])]
    #[TestWith([1, 1.1, 11])]
    #[TestWith([4, 1.4, 14])]
    #[TestWith([10, 2, 20])]
    #[TestWith([15, 2, 20])]
    public function test_consecutive_days_increase_xp_up_to_two_times(int $previousDays, float $multiplier, int $xp): void
    {
        $user = $this->member();
        $this->history($user, $previousDays);
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()
            ->assertJsonPath('data.gamification.xp_awarded', $xp)
            ->assertJsonPath('data.gamification.awarded_xp_multiplier', fn ($actual) => $actual == $multiplier)
            ->assertJsonPath('data.gamification.xp_total', $xp);
        $this->getJson('/api/v1/me')->assertJsonPath('data.xp_multiplier', fn ($actual) => $actual == $multiplier);
    }

    public function test_breaking_the_streak_resets_only_the_multiplier(): void
    {
        $user = $this->member();
        $this->history($user, 4);
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 14);
        $this->travel(2)->days();
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()
            ->assertJsonPath('data.gamification.xp_awarded', 10)->assertJsonPath('data.gamification.xp_total', 24);
    }

    #[TestWith([1, 83])]
    #[TestWith([10, 150])]
    public function test_the_daily_limit_and_goal_bonus_are_multiplied_without_rounding_exploits(int $days, int $total): void
    {
        $user = $this->member();
        $this->history($user, $days);
        for ($i = 0; $i < 12; $i++) {
            $this->postJson('/api/v1/hydration/logs', $this->drink(200))->assertCreated();
        }
        $this->assertSame($total, $user->fresh()->xp_total);
        $this->postJson('/api/v1/hydration/logs', $this->drink(200))->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 0);
        $this->assertSame($total, $user->fresh()->xp_total);
    }

    public function test_offline_records_use_their_own_day_and_replay_keeps_the_original_reward(): void
    {
        $user = $this->member();
        $this->history($user, 10);
        $input = [...$this->drink(), 'occurred_at' => '2026-09-02T12:00:00Z'];
        $this->postJson('/api/v1/hydration/logs', $input)->assertCreated()
            ->assertJsonPath('data.gamification.awarded_xp_multiplier', 1)->assertJsonPath('data.gamification.xp_awarded', 5);
        $xp = $user->fresh()->xp_total;
        $this->travel(3)->days();
        $this->postJson('/api/v1/hydration/logs', $input)->assertOk()
            ->assertJsonPath('data.idempotent_replay', true)->assertJsonPath('data.gamification.xp_awarded', 5);
        $this->assertSame($xp, $user->fresh()->xp_total);
    }

    public function test_syncing_consecutive_offline_days_builds_the_multiplier_in_calendar_order(): void
    {
        $this->member();
        foreach ([8 => 10, 9 => 11, 10 => 12] as $day => $xp) {
            $this->postJson('/api/v1/hydration/logs', [...$this->drink(), 'occurred_at' => sprintf('2026-09-%02dT12:00:00Z', $day)])
                ->assertCreated()->assertJsonPath('data.gamification.xp_awarded', $xp);
        }
    }

    public function test_other_profiles_and_client_supplied_multipliers_cannot_boost_xp(): void
    {
        $other = $this->member();
        $this->history($other, 10);
        $this->member();
        $this->postJson('/api/v1/hydration/logs', [...$this->drink(), 'xp_multiplier' => 100, 'metadata' => ['xp_multiplier' => 100]])
            ->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 10)->assertJsonPath('data.gamification.awarded_xp_multiplier', 1);
    }

    public function test_local_midnight_increases_the_multiplier_once(): void
    {
        $this->member();
        $this->travelTo(CarbonImmutable::parse('2026-09-11T02:59:00Z'));
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 10);
        $this->travelTo(CarbonImmutable::parse('2026-09-11T03:00:00Z'));
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 11);
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()->assertJsonPath('data.gamification.awarded_xp_multiplier', 1.1);
    }

    public function test_an_armed_potion_preserves_the_multiplier_when_the_drink_consumes_it(): void
    {
        $user = $this->member();
        $this->history($user, 3);
        DailyUserStat::query()->where('user_id', $user->id)->whereDate('local_date', '2026-09-11')->delete();
        InventoryBalance::factory()->create(['user_id' => $user->id, 'item_code' => 'streak_freeze', 'quantity' => 1, 'reserved_quantity' => 1]);
        StreakPotionEffect::factory()->create(['user_id' => $user->id, 'eligible_from' => '2026-09-11']);
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()
            ->assertJsonPath('data.gamification.xp_awarded', 13)->assertJsonPath('data.gamification.awarded_xp_multiplier', 1.3);
        $this->assertDatabaseHas('inventory_balances', ['user_id' => $user->id, 'quantity' => 0, 'reserved_quantity' => 0]);
        $this->assertDatabaseCount('inventory_transactions', 1);
    }

    public function test_later_backfills_do_not_reprice_or_credit_an_already_rewarded_day(): void
    {
        $user = $this->member();
        $today = $this->drink();
        $this->postJson('/api/v1/hydration/logs', $today)->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 10);
        $this->postJson('/api/v1/hydration/logs', [...$this->drink(), 'occurred_at' => '2026-09-11T12:00:00Z'])->assertCreated();
        $this->postJson('/api/v1/hydration/logs', $today)->assertOk()->assertJsonPath('data.gamification.xp_awarded', 10);
        $this->postJson('/api/v1/hydration/logs', $this->drink())->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 5);
        $this->assertSame(25, $user->fresh()->xp_total);
    }

    private function member(): User
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-12T12:00:00Z'));
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Teste', 'username' => fake()->unique()->userName(), 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR']);
        HydrationGoal::query()->create(['user_id' => $user->id, 'daily_goal_ml' => 2000, 'starts_on' => '2020-01-01', 'source' => 'test']);
        Sanctum::actingAs($user, ['mobile']);

        return $user;
    }

    private function history(User $user, int $days): void
    {
        for ($i = 1; $i <= $days; $i++) {
            DailyUserStat::query()->create(['user_id' => $user->id, 'local_date' => now('America/Sao_Paulo')->subDays($i)->toDateString(), 'total_ml' => 200, 'goal_ml_snapshot' => 2000, 'log_count' => 1]);
        }
    }

    private function drink(int $amount = 200): array
    {
        return ['amount_ml' => $amount, 'client_event_id' => (string) Str::uuid()];
    }
}
