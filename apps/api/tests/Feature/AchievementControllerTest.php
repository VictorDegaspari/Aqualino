<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achievement\Infrastructure\Models\UserAchievement;
use App\Modules\Gamification\Infrastructure\Models\UserStreak;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AchievementControllerTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['GET', '/api/v1/achievements'])]
    #[TestWith(['POST', '/api/v1/achievements/events'])]
    #[TestWith(['POST', '/api/v1/achievements/first_reminder/celebration'])]
    public function test_requires_authentication(string $method, string $path): void
    {
        $this->json($method, $path)->assertUnauthorized();
    }

    public function test_a_new_profile_has_ten_locked_achievements(): void
    {
        $this->member();
        $items = $this->getJson('/api/v1/achievements')->assertOk()
            ->assertJsonCount(10, 'data.items')->assertJsonPath('data.unlocked_count', 0)->json('data.items');
        foreach ($items as $item) {
            $this->assertNull($item['unlocked_at']);
            $this->assertNull($item['celebrated_at']);
            $this->assertSame(0, $item['progress']);
        }
        $this->assertDatabaseCount('user_achievements', 0);
    }

    public function test_the_first_reminder_is_owned_by_the_current_profile_and_idempotent(): void
    {
        $user = $this->member();
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/v1/achievements/events', ['event' => 'reminder_created'])
                ->assertOk()->assertJsonPath('data.unlocked_count', 1);
        }
        $this->assertDatabaseHas('user_achievements', ['user_id' => $user->id, 'code' => 'first_reminder', 'celebrated_at' => null]);
        $this->assertDatabaseCount('user_achievements', 1);
        $this->assertSame(0, $user->fresh()->xp_total);
        $this->member();
        $this->getJson('/api/v1/achievements')->assertJsonPath('data.unlocked_count', 0);
    }

    #[TestWith([['event' => 'hydration_created']])]
    #[TestWith([['event' => 'reminder_created', 'code' => 'streak_30']])]
    #[TestWith([['event' => 'reminder_created', 'progress' => 30]])]
    #[TestWith([['event' => 'reminder_created', 'user_id' => 'someone-else']])]
    public function test_clients_cannot_grant_arbitrary_achievements(array $input): void
    {
        $this->member();
        $this->postJson('/api/v1/achievements/events', $input)->assertUnprocessable();
        $this->assertDatabaseCount('user_achievements', 0);
    }

    public function test_water_and_daily_goal_awards_are_created_with_the_action_and_survive_replay(): void
    {
        $user = $this->member();
        $input = ['amount_ml' => 500, 'client_event_id' => (string) Str::uuid()];
        $this->postJson('/api/v1/hydration/logs', $input)->assertCreated()
            ->assertJsonPath('data.gamification.new_achievements', ['first_drop', 'first_goal']);
        $this->postJson('/api/v1/hydration/logs', $input)->assertOk()
            ->assertJsonPath('data.gamification.new_achievements', []);
        $this->assertSame(35, $user->fresh()->xp_total);
        $this->assertDatabaseCount('user_achievements', 2);
        $this->getJson('/api/v1/achievements')->assertJsonPath('data.unlocked_count', 2);
    }

    public function test_invalid_hydration_does_not_grant_an_award(): void
    {
        $this->member();
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 20, 'client_event_id' => (string) Str::uuid()])->assertUnprocessable();
        $this->assertDatabaseCount('user_achievements', 0);
    }

    #[TestWith([3])]
    #[TestWith([7])]
    #[TestWith([14])]
    #[TestWith([30])]
    public function test_streak_thresholds_backfill_and_remain_earned_after_the_streak_resets(int $days): void
    {
        $user = $this->member();
        $streak = UserStreak::query()->create(['user_id' => $user->id, 'current_streak' => $days - 1, 'longest_streak' => $days - 1]);
        $before = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNull($before['streak_'.$days]['unlocked_at']);
        $this->assertSame($days - 1, $before['streak_'.$days]['progress']);
        $streak->update(['current_streak' => $days, 'longest_streak' => $days]);
        $after = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNotNull($after['streak_'.$days]['unlocked_at']);
        $streak->update(['current_streak' => 0, 'longest_streak' => 0]);
        $persisted = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertSame($after['streak_'.$days], $persisted['streak_'.$days]);
    }

    #[TestWith([7])]
    #[TestWith([30])]
    public function test_goal_awards_count_distinct_completed_days_including_nonconsecutive_days(int $days): void
    {
        $user = $this->member();
        for ($i = 0; $i < $days; $i++) {
            DailyUserStat::query()->create([
                'user_id' => $user->id, 'local_date' => now()->subDays($i * 2)->toDateString(),
                'total_ml' => 500, 'goal_ml_snapshot' => 500, 'log_count' => 2,
                'goal_achieved_at' => $i === 0 ? null : now(),
            ]);
        }
        $before = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNull($before['goals_'.$days]['unlocked_at']);
        $this->assertSame($days - 1, $before['goals_'.$days]['progress']);
        DailyUserStat::query()->where('user_id', $user->id)->whereNull('goal_achieved_at')->update(['goal_achieved_at' => now()]);
        $after = collect($this->getJson('/api/v1/achievements')->assertOk()->json('data.items'))->keyBy('code');
        $this->assertNotNull($after['goals_'.$days]['unlocked_at']);
        $this->assertSame($days, $after['goals_'.$days]['progress']);
    }

    public function test_creating_or_joining_a_group_grants_a_permanent_team_achievement(): void
    {
        $owner = $this->member();
        $group = $this->postJson('/api/v1/groups', ['name' => 'Nossa equipe'])->assertCreated()->json('data');
        $this->assertDatabaseHas('user_achievements', ['user_id' => $owner->id, 'code' => 'team_player']);
        $guest = $this->member();
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $group['invite']['code']])->assertOk();
        $this->assertDatabaseMissing('user_achievements', ['user_id' => $guest->id]);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->getJson('/api/v1/achievements')->assertJsonPath('data.unlocked_count', 1);
        $this->assertDatabaseHas('user_achievements', ['user_id' => $guest->id, 'code' => 'team_player']);
    }

    public function test_celebration_acknowledgement_is_permanent_and_scoped_to_the_owner(): void
    {
        $owner = $this->member();
        $this->postJson('/api/v1/achievements/events', ['event' => 'reminder_created'])->assertOk();
        $this->member();
        $this->postJson('/api/v1/achievements/first_reminder/celebration')->assertNotFound();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/achievements/streak_30/celebration')->assertNotFound();
        $first = $this->postJson('/api/v1/achievements/first_reminder/celebration')->assertOk()->json();
        $this->assertNotNull($first['data']['celebrated_at']);
        $this->travel(1)->hours();
        $this->postJson('/api/v1/achievements/first_reminder/celebration')->assertOk()->assertExactJson($first);
        $item = collect($this->getJson('/api/v1/achievements')->json('data.items'))->firstWhere('code', 'first_reminder');
        $this->assertSame($first['data']['celebrated_at'], $item['celebrated_at']);
        $this->travelBack();
        $this->deleteJson('/api/v1/me')->assertNoContent();
        $this->assertSame(0, UserAchievement::query()->where('user_id', $owner->id)->count());
    }

    private function member(): User
    {
        $user = User::factory()->create();
        $user->profile()->create([
            'display_name' => 'Pessoa Teste', 'username' => fake()->unique()->userName(),
            'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR',
        ]);
        HydrationGoal::query()->create(['user_id' => $user->id, 'daily_goal_ml' => 500, 'starts_on' => '2020-01-01', 'source' => 'test']);
        Sanctum::actingAs($user);

        return $user;
    }
}
