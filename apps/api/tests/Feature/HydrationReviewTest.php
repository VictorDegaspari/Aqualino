<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Group\Application\GroupChallengeService;
use App\Modules\Group\Application\GroupService;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Hydration\Application\HydrationChallengeService;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class HydrationReviewTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith([3, ['invalid', 'valid'], 'valid', 1])]
    #[TestWith([5, ['invalid', 'invalid'], 'valid', 2])]
    #[TestWith([5, ['invalid', 'invalid', 'invalid'], 'invalid', 3])]
    #[TestWith([3, ['invalid', 'invalid'], 'invalid', 2])]
    public function test_majority_counts_all_eligible_members_including_abstentions(int $size, array $votes, string $expected, int $invalid): void
    {
        Storage::fake('local');
        $this->travelTo(now()->setDate(2026, 9, 7)->setTime(12, 0));
        [$users] = $this->team($size);
        $id = $this->record($users[0]);
        foreach ($votes as $index => $vote) {
            Sanctum::actingAs($users[$index + 1]);
            $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => $vote])->assertOk();
        }
        $this->travel(12)->hours();
        Sanctum::actingAs($users[1]);
        $this->getJson('/api/v1/groups/current/reviews')->assertOk()
            ->assertJsonPath('data.0.status', $expected)->assertJsonPath('data.0.invalid_votes', $invalid);
        $this->assertSame($expected === 'invalid', HydrationLog::findOrFail($id)->invalidated_at !== null);
        $this->assertDatabaseCount('hydration_log_votes', count($votes));
    }

    public function test_photo_and_votes_are_private_and_author_cannot_vote(): void
    {
        $disk = Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(3);
        $id = $this->record($users[0]);
        $log = HydrationLog::findOrFail($id);
        $disk->assertExists($log->photo_path);
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertForbidden();
        $this->getJson("/api/v1/hydration/logs/$id/photo")->assertOk()->assertHeader('content-type', 'image/png');
        Sanctum::actingAs($users[1]);
        $this->getJson("/api/v1/hydration/logs/$id/photo")->assertOk();
        Sanctum::actingAs($this->user());
        $this->getJson("/api/v1/hydration/logs/$id/photo")->assertNotFound();
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertNotFound();
        $this->getJson('/api/v1/groups/current/reviews')->assertJsonCount(0, 'data');
        $this->assertDatabaseCount('hydration_log_votes', 0);
    }

    public function test_voting_is_idempotent_immutable_and_expires_after_twelve_hours(): void
    {
        Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(5);
        $id = $this->record($users[0]);
        Sanctum::actingAs($users[1]);
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk();
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk()->assertJsonPath('data.invalid_votes', 1);
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'valid'])->assertUnprocessable();
        $this->travel(12)->hours();
        Sanctum::actingAs($users[2]);
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertUnprocessable();
        $this->assertDatabaseCount('hydration_log_votes', 1);
    }

    public function test_leaving_and_joining_does_not_change_the_electorate(): void
    {
        Storage::fake('local');
        $this->freezeTime();
        [$users, $group] = $this->team(5);
        $id = $this->record($users[0]);
        app(GroupService::class)->leave($users[4]);
        $newcomer = $this->user();
        app(GroupService::class)->accept($newcomer, $group->invite_code);
        Sanctum::actingAs($newcomer);
        $this->getJson("/api/v1/hydration/logs/$id/photo")->assertNotFound();
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertNotFound();
        Sanctum::actingAs($users[4]);
        $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertNotFound();
        Sanctum::actingAs($users[1]);
        $this->getJson('/api/v1/groups/current/reviews')->assertJsonPath('data.0.eligible_voters', 4)->assertJsonPath('data.0.invalid_votes_required', 3);
    }

    public function test_invalidation_recalculates_water_bonus_xp_streak_and_solo_progress_once(): void
    {
        Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(3);
        $author = $users[0];
        app(HydrationChallengeService::class)->start($author, 'solo');
        $first = $this->record($author, 500);
        $eventId = HydrationLog::findOrFail($first)->client_event_id;
        $this->travel(15)->minutes();
        $this->record($author, 300);
        $this->assertSame(40, $author->fresh()->xp_total);
        foreach ([$users[1], $users[2]] as $voter) {
            Sanctum::actingAs($voter);
            $this->postJson("/api/v1/hydration/logs/$first/votes", ['vote' => 'invalid'])->assertOk();
        }
        $this->postJson("/api/v1/hydration/logs/$first/votes", ['vote' => 'invalid'])->assertOk();
        Sanctum::actingAs($author);
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.today.total_ml', 300)
            ->assertJsonPath('data.today.goal_achieved', false)->assertJsonPath('data.challenges.solo.progress.total_ml', 300)
            ->assertJsonPath('data.today.recording_limits.recorded_today', 2);
        $this->getJson('/api/v1/hydration/logs')->assertJsonCount(2, 'data');
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 500, 'client_event_id' => $eventId])->assertOk()->assertJsonPath('data.idempotent_replay', true);
        $this->assertSame(10, $author->fresh()->xp_total);
        $this->assertDatabaseHas('daily_user_stats', ['user_id' => $author->id, 'total_ml' => 300, 'xp_earned' => 10, 'log_count' => 1]);
    }

    public function test_two_member_group_does_not_require_a_photo_or_start_a_vote(): void
    {
        $this->freezeTime();
        [$users] = $this->team(2);
        Sanctum::actingAs($users[0]);
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid()])->assertCreated();
        $this->getJson('/api/v1/groups/current/reviews')->assertJsonCount(0, 'data');
    }

    public function test_group_requires_real_photo_and_missing_or_invalid_photo_has_no_side_effects(): void
    {
        $disk = Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(3);
        Sanctum::actingAs($users[0]);
        $input = ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid()];
        $this->postJson('/api/v1/hydration/logs', $input)->assertUnprocessable();
        $this->postJson('/api/v1/hydration/logs', [...$input, 'photo_base64' => base64_encode('<svg onload="alert(1)"/>')])->assertUnprocessable();
        $this->assertDatabaseCount('hydration_logs', 0);
        $this->assertSame([], $disk->allFiles());
    }

    public function test_group_prizes_wait_for_reviews_and_use_the_revised_scores(): void
    {
        Storage::fake('local');
        $this->travelTo(now()->setDate(2026, 9, 7)->setTime(12, 0));
        [$users, $group] = $this->team(3);
        $challenge = app(GroupChallengeService::class)->start($group);
        $this->travelTo($challenge->starts_at);
        app(GroupChallengeService::class)->advance($group);
        $this->travelTo($challenge->ends_at->subMinutes(30));
        $id = $this->record($users[0], 500);
        $this->travelTo($challenge->ends_at->addMinutes(15));
        app(GroupChallengeService::class)->advance($group);
        $this->assertNull($challenge->fresh()->finalized_at);
        foreach ([$users[1], $users[2]] as $voter) {
            Sanctum::actingAs($voter);
            $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk();
        }
        app(GroupChallengeService::class)->advance($group);
        $this->assertNotNull($challenge->fresh()->finalized_at);
        $this->assertSame(0, $challenge->participants()->whereNotNull('reward_granted_at')->count());
        $this->assertSame(0, (int) $challenge->participants()->sum('points_hundredths'));
    }

    public function test_only_the_leader_can_disable_new_votes_without_cancelling_existing_ones(): void
    {
        Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(3);
        $id = $this->record($users[0]);
        $expiresAt = HydrationLog::findOrFail($id)->review_expires_at;
        Sanctum::actingAs($users[1]);
        $this->patchJson('/api/v1/groups/current/settings', ['photo_review_enabled' => false])->assertForbidden();
        Sanctum::actingAs($users[0]);
        $this->patchJson('/api/v1/groups/current/settings', ['photo_review_enabled' => 'invalid'])->assertUnprocessable();
        $this->patchJson('/api/v1/groups/current/settings', ['photo_review_enabled' => false])->assertOk()
            ->assertJsonPath('data.photo_review_enabled', false);
        // Turning off voting does not bypass the recording interval.
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid()])->assertUnprocessable();
        $this->travel(15)->minutes();
        $this->postJson('/api/v1/hydration/logs', ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid()])->assertCreated()
            ->assertJsonPath('data.log.review_expires_at', null);
        foreach ([$users[1], $users[2]] as $voter) {
            Sanctum::actingAs($voter);
            $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk();
        }
        $this->assertTrue($expiresAt->equalTo(HydrationLog::findOrFail($id)->review_expires_at));
        $this->assertNotNull(HydrationLog::findOrFail($id)->invalidated_at);
        Sanctum::actingAs($users[0]);
        $this->getJson('/api/v1/me')->assertJsonPath('data.hydration_penalty_count', 1)->assertJsonPath('data.xp_total', 10);
        $this->patchJson('/api/v1/groups/current/settings', ['photo_review_enabled' => true])->assertOk();
        $this->travel(15)->minutes();
        $newId = $this->record($users[0]);
        $this->assertNotNull(HydrationLog::findOrFail($newId)->review_expires_at);
    }

    public function test_solo_chest_waits_for_group_votes_and_can_be_lost_if_the_last_goal_is_annulled(): void
    {
        Storage::fake('local');
        $this->travelTo(now()->setDate(2026, 9, 7)->setTime(12, 0));
        [$users] = $this->team(3);
        $challenge = app(HydrationChallengeService::class)->start($users[0], 'solo');
        for ($day = 0; $day < 7; $day++) {
            if ($day > 0) {
                $this->travel(1)->days();
            }
            $id = $this->record($users[0], 500);
        }
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.challenges.solo.reward.state', 'reviewing');
        $this->postJson("/api/v1/hydration/challenges/{$challenge->id}/reward")->assertUnprocessable();
        foreach ([$users[1], $users[2]] as $voter) {
            Sanctum::actingAs($voter);
            $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk();
        }
        Sanctum::actingAs($users[0]);
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.today.total_ml', 0)
            ->assertJsonPath('data.challenges.solo.reward.state', 'locked')
            ->assertJsonPath('data.challenges.solo.progress.completed_goal_days', 6);
        $this->postJson("/api/v1/hydration/challenges/{$challenge->id}/reward")->assertUnprocessable();
        $this->assertDatabaseCount('inventory_transactions', 0);
    }

    public function test_invalidating_the_only_record_clears_the_mascot_and_streak(): void
    {
        Storage::fake('local');
        $this->freezeTime();
        [$users] = $this->team(3);
        $id = $this->record($users[0]);
        foreach ([$users[1], $users[2]] as $voter) {
            Sanctum::actingAs($voter);
            $this->postJson("/api/v1/hydration/logs/$id/votes", ['vote' => 'invalid'])->assertOk();
        }
        Sanctum::actingAs($users[0]->fresh());
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.mascot.last_log_at', null)
            ->assertJsonPath('data.mascot.current_streak', 0)->assertJsonPath('data.today.total_ml', 0);
        $this->getJson('/api/v1/me')->assertJsonPath('data.xp_total', 0)->assertJsonPath('data.hydration_penalty_count', 1);
    }

    public function test_review_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/groups/current/reviews')->assertUnauthorized();
        $this->getJson('/api/v1/hydration/logs/unknown/photo')->assertUnauthorized();
        $this->postJson('/api/v1/hydration/logs/unknown/votes', ['vote' => 'invalid'])->assertUnauthorized();
        $this->patchJson('/api/v1/groups/current/settings', ['photo_review_enabled' => false])->assertUnauthorized();
    }

    private function user(): User
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Pessoa', 'username' => 'u'.Str::lower(Str::random(12)), 'timezone' => 'UTC', 'locale' => 'pt-BR', 'favorite_volumes_ml' => [300, 500]]);
        $user->hydrationGoals()->create(['daily_goal_ml' => 500, 'starts_on' => now()->subMonth()->toDateString()]);

        return $user->load('profile');
    }

    private function team(int $size): array
    {
        $users = array_map(fn () => $this->user(), range(1, $size));
        $created = app(GroupService::class)->create($users[0], 'Equipe');
        foreach (array_slice($users, 1) as $member) {
            app(GroupService::class)->accept($member, $created['invite']['code']);
        }

        return [$users, Group::findOrFail($created['id'])];
    }

    private function record(User $user, int $amount = 300): string
    {
        Sanctum::actingAs($user);
        $chunk = fn (string $type, string $data): string => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $png = "\x89PNG\r\n\x1a\n".$chunk('IHDR', pack('NNCCCCC', 32, 32, 8, 2, 0, 0, 0))
            .$chunk('IDAT', gzcompress(str_repeat("\0".str_repeat("\0\x88\xcc", 32), 32))).$chunk('IEND', '');

        return $this->postJson('/api/v1/hydration/logs', ['amount_ml' => $amount, 'client_event_id' => (string) Str::uuid(), 'photo_base64' => base64_encode($png)])
            ->assertCreated()->json('data.log.id');
    }
}
