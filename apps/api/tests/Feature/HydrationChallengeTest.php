<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Random\Engine\Mt19937;
use Random\Randomizer;
use Tests\TestCase;

class HydrationChallengeTest extends TestCase
{
    use RefreshDatabase;

    public function test_solo_requires_an_explicit_start_and_runs_seven_days_from_the_actual_weekday(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T20:00:00Z'));
        $this->authenticatedUser();
        $this->getJson('/api/v1/hydration/today')->assertOk()->assertJsonPath('data.challenges.solo', null);
        $this->drink('2026-09-02T19:00:00Z');

        $response = $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo', 'starts_at' => '2026-10-01T00:00:00Z']);
        $response->assertOk()->assertJsonPath('data.solo.status', 'active')
            ->assertJsonPath('data.solo.starts_at', '2026-09-02T20:00:00+00:00')
            ->assertJsonPath('data.solo.progress.starts_on', '2026-09-02')
            ->assertJsonPath('data.solo.progress.ends_on', '2026-09-08')
            ->assertJsonPath('data.solo.progress.days.0.weekday', 3)
            ->assertJsonPath('data.solo.progress.days.6.weekday', 2)
            ->assertJsonPath('data.solo.progress.days.0.total_ml', 300)
            ->assertJsonPath('data.solo.progress.days.6.is_trophy', false)
            ->assertJsonPath('data.solo.reward.state', 'locked');
        $id = $response->json('data.solo.id');
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->assertOk()->assertJsonPath('data.solo.id', $id);
        $this->assertDatabaseCount('hydration_challenges', 1);

        $this->travelTo(CarbonImmutable::parse('2026-09-07T12:00:00Z'));
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.solo.id', $id)
            ->assertJsonPath('data.challenges.solo.progress.days.5.is_today', true);
        $this->travelTo(CarbonImmutable::parse('2026-09-09T03:00:00Z'));
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.solo.status', 'completed');
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->assertOk()
            ->assertJsonPath('data.solo.progress.starts_on', '2026-09-09');
        $this->assertDatabaseCount('hydration_challenges', 2);
    }

    public function test_group_starts_tomorrow_in_its_timezone_and_only_the_owner_can_schedule_it(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-07T02:50:00Z'));
        $owner = $this->authenticatedUser();
        $group = $this->postJson('/api/v1/groups', ['name' => 'Amigos'])->assertCreated()->json('data');
        $this->drink('2026-09-07T02:45:00Z');
        $response = $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group']);
        $response->assertOk()->assertJsonPath('data.group.status', 'scheduled')
            ->assertJsonPath('data.group.starts_at', '2026-09-07T03:00:00+00:00')
            ->assertJsonPath('data.group.progress.starts_on', '2026-09-07')
            ->assertJsonPath('data.group.progress.ends_on', '2026-09-13')
            ->assertJsonPath('data.group.progress.total_ml', 0)
            ->assertJsonPath('data.group.reward', null);
        $id = $response->json('data.group.id');
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertOk()->assertJsonPath('data.group.id', $id);

        $this->authenticatedUser('Asia/Tokyo');
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertForbidden();
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.group.id', $id)
            ->assertJsonPath('data.challenges.group.progress.timezone', 'America/Sao_Paulo')
            ->assertJsonPath('data.challenges.can_start_group', false);

        Sanctum::actingAs($owner, ['mobile']);
        $this->travelTo(CarbonImmutable::parse('2026-09-07T03:01:00Z'));
        $this->drink('2026-09-07T02:59:00Z');
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.group.status', 'active')
            ->assertJsonPath('data.challenges.group.progress.total_ml', 0);
        $this->drink('2026-09-07T03:00:00Z');
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.group.progress.days.0.total_ml', 300);
        $this->getJson('/api/v1/inventory')->assertJsonPath('data.usage.blocked_by_group_challenge', true);
    }

    #[TestWith([0, 'streak_revive', 1])]
    #[TestWith([1, 'streak_freeze', 1])]
    #[TestWith([2, 'xp', 100])]
    public function test_solo_chest_draws_one_server_reward_and_never_grants_it_twice(int $seed, string $type, int $amount): void
    {
        $this->app->instance(Randomizer::class, new Randomizer(new Mt19937($seed)));
        $this->travelTo(CarbonImmutable::parse('2026-09-02T12:00:00Z'));
        $user = $this->authenticatedUser();
        $id = $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->json('data.solo.id');
        $this->postJson("/api/v1/hydration/challenges/{$id}/reward")->assertUnprocessable();
        for ($day = 2; $day <= 8; $day++) {
            $date = sprintf('2026-09-%02dT12:00:00Z', $day);
            $this->travelTo(CarbonImmutable::parse($date));
            $this->drink($date);
        }
        $xpBefore = $user->fresh()->xp_total;
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.solo.reward.state', 'available');
        $this->assertDatabaseCount('inventory_transactions', 0);

        $this->travelTo(CarbonImmutable::parse('2026-09-09T12:00:00Z'));
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->assertUnprocessable();

        $rewardUrl = "/api/v1/hydration/challenges/{$id}/reward";
        $this->postJson($rewardUrl, ['reward_type' => 'xp', 'reward_amount' => 999999])->assertOk()
            ->assertJsonPath('data.reward.state', 'claimed')->assertJsonPath('data.reward.type', $type)->assertJsonPath('data.reward.amount', $amount);
        $this->postJson($rewardUrl)->assertOk()->assertJsonPath('data.reward.type', $type)->assertJsonPath('data.reward.amount', $amount);
        $this->assertSame($xpBefore + ($type === 'xp' ? 100 : 0), $user->fresh()->xp_total);
        if ($type !== 'xp') {
            $this->assertDatabaseCount('inventory_transactions', 1);
            $this->assertDatabaseHas('inventory_balances', ['user_id' => $user->id, 'item_code' => $type, 'quantity' => 1]);
        } else {
            $this->assertDatabaseCount('inventory_transactions', 0);
        }
        $this->authenticatedUser();
        $this->postJson($rewardUrl)->assertNotFound();
    }

    public function test_start_and_reward_require_authentication_and_a_valid_mode(): void
    {
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->assertUnauthorized();
        $this->postJson('/api/v1/hydration/challenges/missing/reward')->assertUnauthorized();
        $this->authenticatedUser();
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'weekly'])->assertUnprocessable();
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertForbidden();
        $this->assertDatabaseCount('hydration_challenges', 0);
    }

    public function test_future_offline_marks_cannot_unlock_the_chest(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T12:00:00Z'));
        $this->authenticatedUser();
        $id = $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->json('data.solo.id');
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'occurred_at' => '2026-09-08T12:00:00Z', 'client_event_id' => (string) Str::uuid()])->assertUnprocessable();
        $this->postJson("/api/v1/hydration/challenges/{$id}/reward")->assertUnprocessable();
        $this->assertDatabaseCount('inventory_transactions', 0);
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.solo.progress.completed_goal_days', 0);
    }

    private function authenticatedUser(string $timezone = 'America/Sao_Paulo'): User
    {
        $user = User::factory()->create();
        UserProfile::query()->create([
            'user_id' => $user->id, 'display_name' => 'Teste', 'username' => 'u_'.strtolower(substr($user->id, -20)),
            'timezone' => $timezone, 'locale' => 'pt-BR', 'favorite_volumes_ml' => [300],
        ]);
        HydrationGoal::query()->create(['user_id' => $user->id, 'daily_goal_ml' => 300, 'starts_on' => '2020-01-01', 'source' => 'test']);
        Sanctum::actingAs($user, ['mobile']);

        return $user->load('profile');
    }

    private function drink(string $occurredAt): void
    {
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'occurred_at' => $occurredAt, 'client_event_id' => (string) Str::uuid()])->assertCreated();
    }
}
