<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Gamification\Application\MascotSnapshotService;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HydrationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_water_registration_is_idempotent_and_updates_the_daily_projection(): void
    {
        CarbonImmutable::setTestNow('2026-09-02T15:00:00Z');
        $user = $this->authenticatedUser();
        $eventId = 'a991604d-897a-4a45-bb5a-7072694b18f4';
        $payload = [
            'amount_ml' => 300,
            'occurred_at' => '2026-09-02T14:55:00Z',
            'source' => 'mobile',
            'client_event_id' => $eventId,
        ];

        $this->postJson('/api/v1/hydration/logs', $payload)
            ->assertCreated()
            ->assertJsonPath('data.today.total_ml', 300)
            ->assertJsonPath('data.gamification.xp_awarded', 10)
            ->assertJsonPath('data.gamification.streak', 1)
            ->assertJsonPath('data.mascot.condition', 'happy')
            ->assertJsonPath('data.idempotent_replay', false);

        $this->postJson('/api/v1/hydration/logs', $payload)
            ->assertOk()
            ->assertJsonPath('data.today.total_ml', 300)
            ->assertJsonPath('data.idempotent_replay', true);

        $this->assertDatabaseCount('hydration_logs', 1);
        $this->assertDatabaseHas('daily_user_stats', [
            'user_id' => $user->id,
            'total_ml' => 300,
            'log_count' => 1,
            'xp_earned' => 10,
        ]);
        $this->assertSame(10, $user->fresh()->xp_total);
    }

    public function test_reaching_goal_awards_bonus_without_incrementing_the_same_day_twice(): void
    {
        CarbonImmutable::setTestNow('2026-09-02T15:00:00Z');
        $user = $this->authenticatedUser(goalMl: 500);

        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 300,
            'client_event_id' => '9a2442f7-dac4-4655-b7c6-4b22f2a8bb8e',
        ])->assertCreated()->assertJsonPath('data.gamification.xp_awarded', 10);

        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 200,
            'client_event_id' => '5c1768a6-45ae-4237-a31d-b7c2ec53e2c4',
        ])
            ->assertCreated()
            ->assertJsonPath('data.today.goal_achieved', true)
            ->assertJsonPath('data.gamification.xp_awarded', 30)
            ->assertJsonPath('data.gamification.streak', 1);

        $this->assertSame(40, $user->fresh()->xp_total);
    }

    public function test_civil_day_difference_uses_the_profile_timezone(): void
    {
        CarbonImmutable::setTestNow('2026-09-02T03:10:00Z');
        $user = $this->authenticatedUser();

        HydrationLog::query()->create([
            'user_id' => $user->id,
            'amount_ml' => 300,
            'occurred_at' => '2026-09-02T02:50:00Z',
            'local_date' => '2026-09-01',
            'timezone_at_event' => 'America/Sao_Paulo',
            'source' => 'mobile',
            'client_event_id' => '2f9e6dfa-a8c7-48bc-8416-5e78ceda78ae',
        ]);

        $snapshot = app(MascotSnapshotService::class)->forUser($user);

        $this->assertSame(1, $snapshot['days_since_last_log']);
        $this->assertSame('yesterday', $snapshot['last_log_semantic_key']);
        $this->assertSame('angry', $snapshot['condition']);
    }

    public function test_mascot_transitions_at_empty_three_and_seven_days(): void
    {
        CarbonImmutable::setTestNow('2026-09-10T15:00:00Z');
        $user = $this->authenticatedUser();
        $service = app(MascotSnapshotService::class);

        $this->assertSame('empty', $service->forUser($user)['condition']);

        $log = HydrationLog::query()->create([
            'user_id' => $user->id,
            'amount_ml' => 300,
            'occurred_at' => '2026-09-07T15:00:00Z',
            'local_date' => '2026-09-07',
            'timezone_at_event' => 'America/Sao_Paulo',
            'source' => 'mobile',
            'client_event_id' => '90b4efe3-3e32-4c5a-8b96-6aa012b95d0d',
        ]);
        $this->assertSame('boiling', $service->forUser($user)['condition']);

        $log->update(['occurred_at' => '2026-09-03T15:00:00Z', 'local_date' => '2026-09-03']);
        $this->assertSame('skeleton', $service->forUser($user)['condition']);
    }

    public function test_invalid_amount_is_rejected_without_writing_a_log(): void
    {
        $this->authenticatedUser();

        $this->postJson('/api/v1/hydration/logs', [
            'amount_ml' => 20,
            'client_event_id' => '557adecf-d8a3-4728-870b-97023993c34f',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');

        $this->assertDatabaseCount('hydration_logs', 0);
    }

    private function authenticatedUser(string $timezone = 'America/Sao_Paulo', int $goalMl = 2000): User
    {
        $user = User::factory()->create();
        UserProfile::query()->create([
            'user_id' => $user->id,
            'display_name' => 'Pessoa Teste',
            'username' => 'u_'.strtolower(substr($user->id, -20)),
            'timezone' => $timezone,
            'locale' => 'pt-BR',
            'favorite_volumes_ml' => [200, 300, 500],
        ]);
        HydrationGoal::query()->create([
            'user_id' => $user->id,
            'daily_goal_ml' => $goalMl,
            'starts_on' => '2020-01-01',
            'source' => 'test',
        ]);
        Sanctum::actingAs($user, ['mobile']);

        return $user->load('profile');
    }
}
