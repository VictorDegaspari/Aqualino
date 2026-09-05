<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Gamification\Application\UserLevelService;
use App\Modules\Gamification\Domain\LevelProgression;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class UserLevelTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith([0, 1, 0, 100])]
    #[TestWith([99, 1, 99, 100])]
    #[TestWith([100, 2, 0, 125])]
    #[TestWith([224, 2, 124, 125])]
    #[TestWith([225, 3, 0, 150])]
    #[TestWith([549, 4, 174, 175])]
    #[TestWith([550, 5, 0, 200])]
    #[TestWith([1800, 10, 0, 325])]
    #[TestWith([34300, 50, 0, 1325])]
    #[TestWith([131174, 99, 2549, 2550])]
    #[TestWith([131175, 100, 0, 2550])]
    #[TestWith([133725, 101, 0, 2550])]
    #[TestWith([266745, 153, 420, 2550])]
    public function test_curve_preserves_overflow_and_stops_increasing_after_level_100(int $xp, int $level, int $current, int $required): void
    {
        $user = User::factory()->create(['xp_total' => $xp]);
        $snapshot = app(UserLevelService::class)->snapshot($user);
        $this->assertSame($level, $snapshot['level']);
        $this->assertSame($current, $snapshot['level_progress']['current_xp']);
        $this->assertSame($required, $snapshot['level_progress']['required_xp']);
        $this->assertSame($required - $current, $snapshot['level_progress']['remaining_xp']);
        $this->assertSame($snapshot, app(UserLevelService::class)->snapshot($user->fresh()));
        $this->assertSame($level, $user->fresh()->level);
    }

    public function test_cost_increases_on_every_level_until_the_plateau(): void
    {
        for ($level = 2; $level < 100; $level++) {
            $this->assertGreaterThan(LevelProgression::requiredXp($level - 1), LevelProgression::requiredXp($level));
        }
        $this->assertSame(LevelProgression::requiredXp(99), LevelProgression::requiredXp(100));
        $this->assertSame(LevelProgression::requiredXp(100), LevelProgression::requiredXp(10000));
    }

    #[TestWith([5, 550])]
    #[TestWith([10, 1800])]
    #[TestWith([50, 34300])]
    #[TestWith([100, 131175])]
    public function test_level_medals_unlock_at_the_threshold_and_are_permanent(int $level, int $xp): void
    {
        $user = $this->member($xp - 1);
        $before = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNull($before['level_'.$level]['unlocked_at']);
        $this->assertSame($level - 1, $before['level_'.$level]['progress']);
        $user->increment('xp_total');
        $after = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNotNull($after['level_'.$level]['unlocked_at']);
        $this->assertSame($level, $after['level_'.$level]['progress']);
        $user->update(['xp_total' => 0]);
        $this->travel(8)->days();
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'solo'])->assertOk();
        $this->getJson('/api/v1/me')->assertJsonPath('data.level', $level)->assertJsonPath('data.level_progress.current_xp', 0);
        $persisted = collect($this->getJson('/api/v1/achievements')->json('data.items'))->keyBy('code');
        $this->assertSame($after['level_'.$level], $persisted['level_'.$level]);
        $this->assertDatabaseCount('user_achievements', $after->whereNotNull('unlocked_at')->count());
    }

    public function test_hydration_updates_level_and_medal_once_and_other_group_members_can_see_it(): void
    {
        $owner = $this->member(540);
        $group = $this->postJson('/api/v1/groups', ['name' => 'Amigos'])->assertCreated()->json('data');
        $input = ['amount_ml' => 200, 'client_event_id' => (string) Str::uuid()];
        $this->postJson('/api/v1/hydration/logs', $input)->assertCreated()
            ->assertJsonPath('data.gamification.level', 5)
            ->assertJsonPath('data.gamification.xp_total', 550)
            ->assertJsonPath('data.gamification.level_progress.current_xp', 0)
            ->assertJsonPath('data.gamification.new_achievements', ['first_drop', 'level_5']);
        $this->postJson('/api/v1/hydration/logs', $input)->assertOk()
            ->assertJsonPath('data.gamification.xp_total', 550)->assertJsonPath('data.gamification.new_achievements', []);
        $this->getJson('/api/v1/me')->assertJsonPath('data.level', 5);
        $this->getJson('/api/v1/gamification/snapshot')->assertOk()->assertJsonPath('data.level', 5);
        $this->member();
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        $members = $this->getJson('/api/v1/groups/current')->assertOk()->json('data.members');
        $this->assertSame(5, collect($members)->firstWhere('user_id', $owner->id)['level']);
    }

    public function test_login_returns_permanent_level_and_clients_cannot_change_it(): void
    {
        $user = $this->member(1800);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()->assertJsonPath('data.user.level', 10)->assertJsonPath('data.user.level_progress.required_xp', 325);
        $this->patchJson('/api/v1/me/profile', ['display_name' => 'Novo nome', 'level' => 999, 'xp_total' => 999999, 'level_started_at_xp' => 0])->assertOk();
        $this->getJson('/api/v1/me')->assertJsonPath('data.level', 10)->assertJsonPath('data.xp_total', 1800);
    }

    public function test_future_offline_marks_cannot_award_xp_levels_or_medals(): void
    {
        $user = $this->member(549);
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 200, 'client_event_id' => (string) Str::uuid(), 'occurred_at' => now()->addDay()->toIso8601String()])->assertUnprocessable();
        $this->getJson('/api/v1/me')->assertJsonPath('data.level', 4)->assertJsonPath('data.xp_total', 549);
        $this->assertDatabaseMissing('user_achievements', ['user_id' => $user->id, 'code' => 'level_5']);
    }

    public function test_migration_preserves_existing_levels_and_partial_progress(): void
    {
        $user = User::factory()->create(['xp_total' => 9965]);
        $migration = require database_path('migrations/2026_09_05_142125_add_permanent_levels_to_users_table.php');
        $migration->down();
        $migration->up();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'xp_total' => 9965, 'level' => 100, 'level_started_at_xp' => 9900]);
        $snapshot = app(UserLevelService::class)->snapshot($user->fresh());
        $this->assertSame(100, $snapshot['level']);
        $this->assertSame(65, $snapshot['level_progress']['current_xp']);
        $this->assertSame(2550, $snapshot['level_progress']['required_xp']);
    }

    private function member(int $xp = 0): User
    {
        $user = User::factory()->create(['xp_total' => $xp]);
        $user->profile()->create(['display_name' => 'Teste', 'username' => fake()->unique()->userName(), 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR']);
        HydrationGoal::query()->create(['user_id' => $user->id, 'daily_goal_ml' => 2000, 'starts_on' => '2020-01-01', 'source' => 'test']);
        Sanctum::actingAs($user, ['mobile']);

        return $user;
    }
}
