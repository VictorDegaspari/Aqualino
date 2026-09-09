<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupChallengeParticipant;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Random\Engine;
use Random\Randomizer;
use Tests\TestCase;

class GroupChallengeTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['2026-09-04T02:59:59Z', 15])]
    #[TestWith(['2026-09-04T03:00:00Z', 0])]
    #[TestWith(['2026-09-04T03:10:00Z', 0])]
    public function test_group_midnight_cutoff_preserves_personal_history_in_the_users_timezone(string $receivedAt, int $points): void
    {
        [$users] = $this->group([2000, 2000]);
        $this->start();
        $users[0]->profile->update(['timezone' => 'Asia/Tokyo']);
        $this->travelTo(CarbonImmutable::parse($receivedAt));
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid(), 'occurred_at' => '2026-09-04T02:30:00Z'])
            ->assertCreated()->assertJsonPath('data.log.local_date', '2026-09-04');
        $this->home()->assertJsonPath('data.challenges.group.progress.days.0.total_ml', $points > 0 ? 300 : 0);
        $row = collect($this->home()->json('data.challenges.group.leaderboard'))->firstWhere('user_id', $users[0]->id);
        $this->assertSame($points, $row['points']);
        $this->getJson('/api/v1/hydration/logs?local_date=2026-09-04')->assertJsonPath('data.0.amount_ml', 300);
        $this->assertDatabaseCount('hydration_logs', 1);
    }

    public function test_previous_day_sync_is_personal_and_does_not_open_a_team_photo_vote(): void
    {
        [$users] = $this->group([2000, 2000, 2000]);
        $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-04T03:00:00Z'));
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid(), 'occurred_at' => '2026-09-04T02:30:00Z'])->assertCreated();
        $this->assertDatabaseHas('hydration_logs', ['user_id' => $users[0]->id, 'review_group_id' => null, 'review_expires_at' => null, 'amount_ml' => 300]);
        $this->home()->assertJsonPath('data.challenges.group.progress.total_ml', 0);
    }

    public function test_requires_two_members_and_cancels_if_the_roster_is_no_longer_eligible_at_start(): void
    {
        [$users, $group] = $this->group([2000]);
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertUnprocessable()
            ->assertJsonPath('error.fields.challenge.0', 'Convide pelo menos mais uma pessoa para iniciar o desafio do grupo.');
        $this->assertDatabaseCount('hydration_challenges', 0);
        $guest = $this->member();
        $this->join($guest, $group);
        Sanctum::actingAs($users[0]);
        $id = $this->start();
        Sanctum::actingAs($guest);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T03:00:00Z'));
        Sanctum::actingAs($users[0]);
        $this->home()->assertJsonPath('data.challenges.group.status', 'cancelled')
            ->assertJsonPath('data.challenges.group.participating', false);
        $this->assertSame(0, PotionUsageBlock::query()->where('context_id', $id)->count());
        $this->assertDatabaseCount('group_challenge_participants', 0);
    }

    public function test_caps_daily_points_uses_personal_goals_and_keeps_competition_ties(): void
    {
        [$users] = $this->group([2000, 4000, 2000, 2000, 2000]);
        $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-09T20:00:00Z'));
        foreach ($users as $index => $user) {
            for ($day = 3; $day <= 9; $day++) {
                $amount = $index === 1 ? 5000 : ($index === 0 ? 3000 : 2000);
                if ($day === 9 && $index >= 2) {
                    $amount = $index === 2 ? 1000 : 0;
                }
                if ($amount) {
                    $this->log($user, sprintf('2026-09-%02dT12:00:00Z', $day), $amount);
                }
            }
        }
        $response = $this->home()->assertOk();
        $rows = $response->json('data.challenges.group.leaderboard');
        $this->assertSame([700, 700, 650, 600, 600], array_column($rows, 'points'));
        $this->assertSame([1, 1, 3, 4, 4], array_column($rows, 'rank'));
        $this->assertSame(['gold', 'gold', 'bronze', null, null], array_column($rows, 'medal'));
        $this->assertSame([true, true, false, true, true], array_column($rows, 'tied'));
        $this->assertSame([21000, 35000, 13000, 12000, 12000], array_column($rows, 'total_ml'));
        $response->assertJsonMissingPath('data.challenges.group.leaderboard.0.email')
            ->assertJsonMissingPath('data.challenges.group.leaderboard.0.days')
            ->assertJsonMissingPath('data.challenges.group.leaderboard.0.occurred_at')
            ->assertJsonPath('data.challenges.group.rules.ranking', 'competition');
    }

    public function test_rounds_daily_points_to_the_display_precision_before_comparing_ties(): void
    {
        [$users] = $this->group([3000, 3001]);
        $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T12:00:00Z'));
        $this->log($users[0], '2026-09-03T11:00:00Z', 50);
        $this->log($users[1], '2026-09-03T11:00:00Z', 50);
        $rows = $this->home()->json('data.challenges.group.leaderboard');
        $this->assertSame([1.67, 1.67], array_column($rows, 'points'));
        $this->assertSame([1, 1], array_column($rows, 'rank'));
    }

    public function test_freezes_goals_before_a_mid_challenge_edit_and_uses_the_group_day_boundaries(): void
    {
        [$users] = $this->group([2000, 2000]);
        $users[0]->profile->update(['timezone' => 'Asia/Tokyo']);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T03:01:00Z'));
        $this->putJson('/api/v1/hydration/goals/current', ['daily_goal_ml' => 500])->assertOk();
        $this->log($users[0], '2026-09-03T02:59:59Z', 2000);
        $this->log($users[0], '2026-09-03T03:00:00Z', 500);
        $this->home()->assertJsonPath('data.challenges.group.progress.days.0.goal_ml', 2000)
            ->assertJsonPath('data.challenges.group.progress.days.0.total_ml', 500)
            ->assertJsonPath('data.challenges.group.leaderboard.0.points', 25);
        $this->assertDatabaseHas('group_challenge_participants', ['challenge_id' => $id, 'user_id' => $users[0]->id, 'goal_ml' => 2000]);
    }

    public function test_late_joiner_waits_for_the_next_roster_and_cannot_receive_competitive_progress_or_potion_blocks(): void
    {
        [$users, $group] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T12:00:00Z'));
        $late = $this->member();
        $this->join($late, $group);
        $this->log($late, '2026-09-03T11:00:00Z', 2000);
        $this->home()->assertJsonPath('data.challenges.group.participating', false)
            ->assertJsonPath('data.challenges.group.progress.total_ml', 0)->assertJsonCount(2, 'data.challenges.group.leaderboard');
        $this->assertDatabaseMissing('group_challenge_participants', ['challenge_id' => $id, 'user_id' => $late->id]);
        $this->assertFalse(PotionUsageBlock::isActiveFor($late, now()));
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:00:00Z'));
        $this->home()->assertJsonPath('data.challenges.group.status', 'active')
            ->assertJsonPath('data.challenges.group.progress.starts_on', '2026-09-10')
            ->assertJsonPath('data.challenges.group.participating', true)->assertJsonCount(3, 'data.challenges.group.leaderboard')
            ->assertJsonPath('data.challenges.group_result.status', 'settling');
        Sanctum::actingAs($users[0]);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->home()->assertJsonPath('data.challenges.group', null)->assertJsonPath('data.challenges.group_result', null);
    }

    #[TestWith([0, 'xp', 100])]
    #[TestWith([69, 'xp', 100])]
    #[TestWith([70, 'streak_freeze', 1])]
    #[TestWith([89, 'streak_freeze', 1])]
    #[TestWith([90, 'streak_revive', 1])]
    #[TestWith([99, 'streak_revive', 1])]
    public function test_each_tied_winner_gets_one_weighted_reward_only_after_finalization(int $roll, string $type, int $amount): void
    {
        $this->app->instance(Randomizer::class, new Randomizer(new class($roll) implements Engine
        {
            public function __construct(private readonly int $roll) {}

            public function generate(): string
            {
                return pack('V', $this->roll);
            }
        }));
        [$users] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-09T20:00:00Z'));
        foreach ($users as $user) {
            $this->log($user, '2026-09-03T12:00:00Z', 2000);
        }
        $before = $users[0]->fresh()->xp_total;
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:14:59Z'));
        $this->home()->assertJsonPath('data.challenges.group_result.status', 'settling')
            ->assertJsonPath('data.challenges.group_result.reward', null);
        $this->assertDatabaseMissing('group_challenge_participants', ['challenge_id' => $id, 'reward_type' => $type]);

        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:15:00Z'));
        $this->artisan('groups:advance-challenges')->assertSuccessful();
        $this->artisan('groups:advance-challenges')->assertSuccessful();
        $this->home()->assertJsonPath('data.challenges.group_result.status', 'completed')
            ->assertJsonPath('data.challenges.group_result.reward.type', $type)
            ->assertJsonPath('data.challenges.group_result.reward.amount', $amount);
        $this->assertSame(2, GroupChallengeParticipant::query()->where('challenge_id', $id)->whereNotNull('reward_granted_at')->count());
        $this->assertSame($before + ($type === 'xp' ? 100 : 0), $users[0]->fresh()->xp_total);
        $this->assertDatabaseCount('inventory_transactions', $type === 'xp' ? 0 : 2);
        if ($type !== 'xp') {
            foreach ($users as $user) {
                $this->assertDatabaseHas('inventory_balances', ['user_id' => $user->id, 'item_code' => $type, 'quantity' => 1]);
            }
        }
        $this->postJson("/api/v1/hydration/challenges/{$id}/reward")->assertNotFound();
    }

    public function test_offline_logs_after_midnight_never_count_even_during_settlement_or_after_finalization(): void
    {
        [$users] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:14:59Z'));
        $this->log($users[0], '2026-09-09T20:00:00Z', 1000, now()->toIso8601String());
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:15:00Z'));
        $this->log($users[1], '2026-09-09T20:00:00Z', 2000, now()->toIso8601String());
        $this->travelTo(CarbonImmutable::parse('2026-09-10T04:00:00Z'));
        $rows = $this->home()->json('data.challenges.group_result.leaderboard');
        $this->assertSame([0, 0], array_column($rows, 'points'));
        $this->assertSame([null, null], array_column($rows, 'rank'));
        $this->log($users[1], '2026-09-08T20:00:00Z', 2000);
        $this->assertSame($rows, $this->home()->json('data.challenges.group_result.leaderboard'));
        $this->assertSame(0, GroupChallengeParticipant::query()->where('challenge_id', $id)->whereNotNull('reward_granted_at')->count());
    }

    public function test_zero_points_never_award_a_podium_or_reward_and_outsiders_cannot_see_the_board(): void
    {
        $this->group([2000, 2000]);
        $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:15:00Z'));
        $rows = $this->home()->assertJsonPath('data.challenges.group_result.reward', null)->json('data.challenges.group_result.leaderboard');
        $this->assertSame([null, null], array_column($rows, 'rank'));
        $this->assertSame([null, null], array_column($rows, 'medal'));
        $this->assertSame(0, GroupChallengeParticipant::query()->whereNotNull('reward_granted_at')->count());
        Sanctum::actingAs($this->member());
        $this->home()->assertJsonPath('data.challenges.group', null)->assertJsonPath('data.challenges.group_result', null);
    }

    public function test_departure_preserves_the_locked_roster_and_account_deletion_archives_participation(): void
    {
        [$users] = $this->group([2000, 2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T12:00:00Z'));
        $this->log($users[1], '2026-09-03T11:00:00Z', 500);
        Sanctum::actingAs($users[1]);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        Sanctum::actingAs($users[0]);
        $this->home()->assertJsonCount(3, 'data.challenges.group.leaderboard');
        Sanctum::actingAs($users[2]);
        $this->deleteJson('/api/v1/me')->assertNoContent();
        $this->assertSoftDeleted('group_challenge_participants', ['challenge_id' => $id, 'user_id' => $users[2]->id]);
        Sanctum::actingAs($users[0]);
        $rows = $this->home()->json('data.challenges.group.leaderboard');
        $this->assertSame('Conta excluída', collect($rows)->firstWhere('user_id', $users[2]->id)['display_name']);
    }

    public function test_tied_winners_have_independent_draws_and_group_responses_expose_the_real_result(): void
    {
        $this->app->instance(Randomizer::class, new Randomizer(new class implements Engine
        {
            private int $draw = 0;

            public function generate(): string
            {
                return pack('V', $this->draw++ === 0 ? 0 : 90);
            }
        }));
        [$users] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-09T12:00:00Z'));
        foreach ($users as $user) {
            $this->log($user, '2026-09-09T11:00:00Z', 2000);
        }
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:15:00Z'));
        $this->getJson('/api/v1/groups/current')->assertOk()
            ->assertJsonPath('data.previous_challenge.status', 'completed')
            ->assertJsonCount(2, 'data.previous_challenge.leaderboard');
        $this->assertSame(['streak_revive', 'xp'], GroupChallengeParticipant::query()->where('challenge_id', $id)
            ->orderBy('reward_type')->pluck('reward_type')->all());
        $this->getJson('/api/v1/me')->assertJsonPath('data.group_medals', ['gold' => 1, 'silver' => 0, 'bronze' => 0]);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->getJson('/api/v1/me')->assertJsonPath('data.group_medals.gold', 1);
    }

    public function test_seven_civil_days_include_the_daylight_saving_transition(): void
    {
        [$users, $group] = $this->group([2000, 2000]);
        Group::query()->findOrFail($group['id'])->update(['timezone' => 'America/New_York']);
        $this->travelTo(CarbonImmutable::parse('2026-10-31T12:00:00Z'));
        $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertOk()
            ->assertJsonPath('data.group.starts_at', '2026-11-01T04:00:00+00:00')
            ->assertJsonPath('data.group.ends_at', '2026-11-08T05:00:00+00:00')
            ->assertJsonPath('data.group.progress.starts_on', '2026-11-01')
            ->assertJsonPath('data.group.progress.ends_on', '2026-11-07');
        $this->travelTo(CarbonImmutable::parse('2026-11-02T05:00:00Z'));
        $this->log($users[0], '2026-11-02T04:59:59Z', 500);
        $this->home()->assertJsonPath('data.challenges.group.progress.days.0.total_ml', 500)
            ->assertJsonPath('data.challenges.group.progress.days.1.total_ml', 0);
    }

    public function test_ending_the_group_archives_its_round_and_releases_potion_blocks(): void
    {
        [$users] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-03T12:00:00Z'));
        foreach ($users as $user) {
            Sanctum::actingAs($user);
            $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        }
        $this->assertSoftDeleted('hydration_challenges', ['id' => $id]);
        $this->assertSame(2, GroupChallengeParticipant::onlyTrashed()->where('challenge_id', $id)->count());
        foreach ($users as $user) {
            $this->assertFalse(PotionUsageBlock::isActiveFor($user, now()));
        }
    }

    public function test_closing_a_group_during_sync_grace_still_awards_the_finished_round(): void
    {
        [$users] = $this->group([2000, 2000]);
        $id = $this->start();
        $this->travelTo(CarbonImmutable::parse('2026-09-09T12:00:00Z'));
        foreach ($users as $user) {
            $this->log($user, '2026-09-09T11:00:00Z', 2000);
        }
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:01:00Z'));
        foreach ($users as $user) {
            Sanctum::actingAs($user);
            $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        }
        $this->assertSoftDeleted('hydration_challenges', ['id' => $id]);
        $this->travelTo(CarbonImmutable::parse('2026-09-10T03:15:00Z'));
        $this->artisan('groups:advance-challenges')->assertSuccessful();
        $this->artisan('groups:advance-challenges')->assertSuccessful();
        $this->assertSame(2, GroupChallengeParticipant::withTrashed()->where('challenge_id', $id)->whereNotNull('reward_granted_at')->count());
        $this->getJson('/api/v1/me')->assertJsonPath('data.group_medals.gold', 1);
    }

    private function group(array $goals): array
    {
        $this->travelTo(CarbonImmutable::parse('2026-09-02T12:00:00Z'));
        $users = array_map(fn (int $goal): User => $this->member($goal), $goals);
        Sanctum::actingAs($users[0]);
        $group = $this->postJson('/api/v1/groups', ['name' => 'Maré de amigos'])->assertCreated()->json('data');
        foreach (array_slice($users, 1) as $user) {
            $this->join($user, $group);
        }
        Sanctum::actingAs($users[0]);

        return [$users, $group];
    }

    private function member(int $goal = 2000): User
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Pessoa', 'username' => fake()->unique()->regexify('[a-z]{16}'),
            'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR', 'favorite_volumes_ml' => [300]]);
        HydrationGoal::query()->create(['user_id' => $user->id, 'daily_goal_ml' => $goal, 'starts_on' => '2020-01-01', 'source' => 'test']);

        return $user->load('profile');
    }

    private function join(User $user, array $group): void
    {
        Sanctum::actingAs($user);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
    }

    private function start(): string
    {
        return $this->postJson('/api/v1/hydration/challenges', ['mode' => 'group'])->assertOk()->json('data.group.id');
    }

    private function home(): TestResponse
    {
        return $this->getJson('/api/v1/hydration/today');
    }

    private function log(User $user, string $occurredAt, int $amount, ?string $receivedAt = null): void
    {
        $moment = CarbonImmutable::parse($occurredAt);
        $log = HydrationLog::query()->create([
            'user_id' => $user->id, 'amount_ml' => $amount, 'occurred_at' => $moment,
            'local_date' => $moment->setTimezone($user->profile->timezone)->toDateString(),
            'timezone_at_event' => $user->profile->timezone, 'source' => 'mobile', 'client_event_id' => (string) Str::uuid(), 'xp_awarded' => 0,
        ]);
        $log->forceFill(['created_at' => $receivedAt ? CarbonImmutable::parse($receivedAt) : $moment])->save();
    }
}
