<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HydrationWeekTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_401_when_week_is_requested_without_a_token(): void
    {
        $this->getJson('/api/v1/hydration/today')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_returns_seven_days_with_progress_states_without_a_podium_trophy(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T15:00:00Z'));
        $user = $this->authenticatedUser('UTC');
        $this->dailyStat($user, '2026-08-31', 2000);
        $this->dailyStat($user, '2026-09-01', 300);
        $this->dailyStat($user, '2026-09-02', 700);
        StreakPotionEffect::factory()->for($user)->create([
            'item_code' => InventoryItemCode::StreakFreeze,
            'status' => StreakPotionEffectStatus::Consumed,
            'active_key' => null,
            'eligible_from' => '2026-08-31',
            'target_local_date' => '2026-09-01',
            'consumed_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/hydration/today');

        $response
            ->assertOk()
            ->assertJsonCount(7, 'data.week.days')
            ->assertJsonPath('data.week.mode', 'civil_week')
            ->assertJsonPath('data.week.starts_on', '2026-08-31')
            ->assertJsonPath('data.week.ends_on', '2026-09-06')
            ->assertJsonPath('data.week.current_date', '2026-09-02')
            ->assertJsonPath('data.week.completed_goal_days', 1)
            ->assertJsonPath('data.week.total_ml', 3000)
            ->assertJsonPath('data.week.days.0.state', 'goal_achieved')
            ->assertJsonPath('data.week.days.0.percentage', 100)
            ->assertJsonPath('data.week.days.1.state', 'missed')
            ->assertJsonPath('data.week.days.1.protection', 'streak_freeze')
            ->assertJsonPath('data.week.days.2.state', 'in_progress')
            ->assertJsonPath('data.week.days.2.is_today', true)
            ->assertJsonPath('data.week.days.3.state', 'future')
            ->assertJsonPath('data.week.days.6.is_trophy', false);
    }

    public function test_week_boundaries_use_the_profile_timezone(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-07T01:00:00Z'));
        $this->authenticatedUser('America/Sao_Paulo');

        $response = $this->getJson('/api/v1/hydration/today');

        $response
            ->assertOk()
            ->assertJsonPath('data.week.starts_on', '2026-08-31')
            ->assertJsonPath('data.week.ends_on', '2026-09-06')
            ->assertJsonPath('data.week.current_date', '2026-09-06')
            ->assertJsonPath('data.week.timezone', 'America/Sao_Paulo')
            ->assertJsonPath('data.week.days.6.is_today', true)
            ->assertJsonPath('data.week.days.6.is_trophy', false);
    }

    private function authenticatedUser(string $timezone): User
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
            'daily_goal_ml' => 2000,
            'starts_on' => '2020-01-01',
            'source' => 'test',
        ]);
        Sanctum::actingAs($user, ['mobile']);

        return $user->load('profile');
    }

    private function dailyStat(User $user, string $localDate, int $totalMl): void
    {
        DailyUserStat::query()->create([
            'user_id' => $user->id,
            'local_date' => $localDate,
            'total_ml' => $totalMl,
            'goal_ml_snapshot' => 2000,
            'goal_achieved_at' => $totalMl >= 2000 ? now() : null,
            'xp_earned' => 10,
            'record_xp_earned' => 10,
            'log_count' => 1,
        ]);
    }
}
