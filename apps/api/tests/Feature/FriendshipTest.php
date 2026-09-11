<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Group\Infrastructure\Models\GroupChallengeParticipant;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class FriendshipTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['GET', '/api/v1/friends'])]
    #[TestWith(['GET', '/api/v1/people?query=ana'])]
    #[TestWith(['PUT', '/api/v1/achievements/highlights'])]
    #[TestWith(['GET', '/api/v1/people/01ARZ3NDEKTSV4RRFFQ69G5FAV'])]
    #[TestWith(['PUT', '/api/v1/friends/01ARZ3NDEKTSV4RRFFQ69G5FAV'])]
    #[TestWith(['POST', '/api/v1/friends/01ARZ3NDEKTSV4RRFFQ69G5FAV/accept'])]
    #[TestWith(['DELETE', '/api/v1/friends/01ARZ3NDEKTSV4RRFFQ69G5FAV'])]
    public function test_requires_authentication(string $method, string $path): void
    {
        $this->json($method, $path)->assertUnauthorized();
    }

    public function test_requests_are_unique_in_both_directions_and_only_the_recipient_can_accept(): void
    {
        $ana = $this->member('ana');
        $bruno = $this->member('bruno');
        $carla = $this->member('carla');
        Sanctum::actingAs($ana);
        $this->putJson('/api/v1/friends/'.$bruno->id)->assertOk()->assertJsonPath('data.relationship', 'outgoing');
        $this->putJson('/api/v1/friends/'.$bruno->id)->assertOk();
        $this->postJson('/api/v1/friends/'.$bruno->id.'/accept')->assertForbidden();
        $this->getJson('/api/v1/friends')->assertJsonCount(1, 'data.outgoing')->assertJsonCount(0, 'data.friends');
        Sanctum::actingAs($carla);
        $this->postJson('/api/v1/friends/'.$ana->id.'/accept')->assertForbidden();
        $this->deleteJson('/api/v1/friends/'.$ana->id)->assertOk();
        $this->assertDatabaseCount('friendships', 1);
        Sanctum::actingAs($bruno);
        $this->putJson('/api/v1/friends/'.$ana->id)->assertOk()->assertJsonPath('data.relationship', 'incoming');
        $this->assertDatabaseCount('friendships', 1);
        $this->getJson('/api/v1/friends')->assertJsonPath('data.incoming.0.id', $ana->id);
        $this->postJson('/api/v1/friends/'.$ana->id.'/accept')->assertOk()->assertJsonPath('data.relationship', 'friends');
        $this->postJson('/api/v1/friends/'.$ana->id.'/accept')->assertOk();
        $this->getJson('/api/v1/friends')->assertJsonPath('data.friends.0.id', $ana->id)->assertJsonCount(0, 'data.incoming');
        Sanctum::actingAs($ana);
        $this->getJson('/api/v1/friends')->assertJsonPath('data.friends.0.id', $bruno->id);
        $this->deleteJson('/api/v1/friends/'.$bruno->id)->assertOk()->assertJsonPath('data.relationship', 'none');
        $this->assertDatabaseCount('friendships', 0);
    }

    public function test_pending_requests_can_be_cancelled_or_declined_and_self_requests_are_rejected(): void
    {
        $ana = $this->member('ana');
        $bruno = $this->member('bruno');
        Sanctum::actingAs($ana);
        $this->putJson('/api/v1/friends/'.$ana->id)->assertUnprocessable();
        $this->putJson('/api/v1/friends/'.$bruno->id)->assertOk();
        $this->deleteJson('/api/v1/friends/'.$bruno->id)->assertOk();
        $this->assertDatabaseCount('friendships', 0);
        $this->putJson('/api/v1/friends/'.$bruno->id)->assertOk();
        Sanctum::actingAs($bruno);
        $this->deleteJson('/api/v1/friends/'.$ana->id)->assertOk();
        $this->assertDatabaseCount('friendships', 0);
    }

    public function test_username_search_escapes_wildcards_and_excludes_self_and_deleted_accounts(): void
    {
        $ana = $this->member('ana');
        $target = $this->member('ana_swim');
        $this->member('anaxswim');
        $deleted = $this->member('ana_old');
        $deleted->delete();
        Sanctum::actingAs($ana);
        $this->getJson('/api/v1/people?query=%40ANA_')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $target->id);
        $this->getJson('/api/v1/people?query=%25')->assertUnprocessable();
        $this->getJson('/api/v1/people?query=an')->assertUnprocessable();
        $this->getJson('/api/v1/people/'.$deleted->id)->assertNotFound();
        $this->putJson('/api/v1/friends/'.$deleted->id)->assertNotFound();
        $this->getJson('/api/v1/people?query=nobody')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_visiting_a_profile_shows_earned_awards_and_saved_highlights_without_private_fields(): void
    {
        $owner = $this->member('owner');
        $guest = $this->member('guest');
        $awards = app(AchievementService::class);
        $awards->grant($owner, 'first_drop');
        $awards->grant($owner, 'first_reminder');
        $challenge = HydrationChallenge::query()->create(['user_id' => $owner->id, 'mode' => 'group', 'timezone' => 'UTC', 'starts_at' => now()->subDays(7), 'ends_at' => now(), 'finalized_at' => now()]);
        GroupChallengeParticipant::query()->create(['challenge_id' => $challenge->id, 'user_id' => $owner->id, 'goal_ml' => 2000, 'final_progress' => ['points' => 100], 'medal' => 'gold']);
        Sanctum::actingAs($guest);
        $this->getJson('/api/v1/people/'.$owner->id)->assertOk()->assertJsonPath('data.profile_highlights', ['first_reminder', 'first_drop']);
        Sanctum::actingAs($owner);
        $this->putJson('/api/v1/achievements/highlights', ['codes' => ['first_drop', 'first_reminder']])->assertOk()->assertJsonPath('data.profile_highlights', ['first_drop', 'first_reminder']);
        $this->assertSame(['first_drop', 'first_reminder'], $owner->profile->fresh()->achievement_highlights);
        $this->getJson('/api/v1/achievements')->assertJsonPath('data.profile_highlights', ['first_drop', 'first_reminder']);
        Sanctum::actingAs($guest);
        $payload = $this->getJson('/api/v1/people/'.$owner->id)->assertOk()
            ->assertJsonPath('data.profile_highlights', ['first_drop', 'first_reminder'])
            ->assertJsonPath('data.group_medals', ['gold' => 1, 'silver' => 0, 'bronze' => 0])
            ->assertJsonCount(2, 'data.achievements')->json('data');
        $this->assertEqualsCanonicalizing(['id', 'display_name', 'username', 'avatar_url', 'level', 'relationship', 'group_medals', 'achievements', 'profile_highlights', 'hydration_week'], array_keys($payload));
        $this->assertNull($guest->profile->fresh()->achievement_highlights);
        Sanctum::actingAs($owner);
        $this->putJson('/api/v1/achievements/highlights', ['codes' => []])->assertOk()->assertJsonPath('data.profile_highlights', []);
        Sanctum::actingAs($guest);
        $this->getJson('/api/v1/people/'.$owner->id)->assertJsonPath('data.profile_highlights', []);
    }

    #[TestWith([[]])]
    #[TestWith([['codes' => ['first_drop']]])]
    #[TestWith([['codes' => ['invalid']]])]
    #[TestWith([['codes' => ['first_reminder', 'first_reminder']]])]
    #[TestWith([['codes' => ['first_drop', 'first_reminder', 'first_goal', 'team_player', 'streak_3']]])]
    public function test_highlights_reject_invalid_locked_duplicate_or_excess_awards(array $input): void
    {
        $user = $this->member('ana');
        app(AchievementService::class)->grant($user, 'first_reminder');
        Sanctum::actingAs($user);
        $this->putJson('/api/v1/achievements/highlights', $input)->assertUnprocessable();
        $this->assertNull($user->profile->fresh()->achievement_highlights);
    }

    public function test_deleting_an_account_removes_its_friendships_and_public_profile(): void
    {
        $ana = $this->member('ana');
        $bruno = $this->member('bruno');
        Sanctum::actingAs($ana);
        $this->putJson('/api/v1/friends/'.$bruno->id)->assertOk();
        $this->deleteJson('/api/v1/me')->assertNoContent();
        $this->assertDatabaseCount('friendships', 0);
        Sanctum::actingAs($bruno);
        $this->getJson('/api/v1/friends')->assertJsonCount(0, 'data.incoming');
        $this->getJson('/api/v1/people/'.$ana->id)->assertNotFound();
    }

    public function test_public_week_uses_participant_timezone_zero_days_and_no_friend_count(): void
    {
        // Wednesday UTC is still Tuesday for this participant.
        $this->travelTo(CarbonImmutable::parse('2026-09-09T01:00:00Z'));
        $owner = $this->member('owner');
        $viewer = $this->member('viewer');
        foreach (['2026-09-06' => 9000, '2026-09-07' => 3000, '2026-09-09' => 8000] as $date => $total) {
            DailyUserStat::query()->create(['user_id' => $owner->id, 'local_date' => $date, 'total_ml' => $total, 'goal_ml_snapshot' => 2000]);
        }
        DailyUserStat::query()->create(['user_id' => $viewer->id, 'local_date' => '2026-09-08', 'total_ml' => 9000, 'goal_ml_snapshot' => 2000]);
        Sanctum::actingAs($owner);
        $this->putJson('/api/v1/friends/'.$viewer->id)->assertOk();
        Sanctum::actingAs($viewer);
        $this->postJson('/api/v1/friends/'.$owner->id.'/accept')->assertOk();
        $this->getJson('/api/v1/friends')->assertJsonCount(1, 'data.friends');
        $this->getJson('/api/v1/people/'.$owner->id)->assertOk()
            ->assertJsonMissingPath('data.friends')->assertJsonMissingPath('data.friend_count')->assertJsonMissingPath('data.friends_count')
            ->assertJsonPath('data.hydration_week.starts_on', '2026-09-07')
            ->assertJsonPath('data.hydration_week.ends_on', '2026-09-13')
            ->assertJsonPath('data.hydration_week.current_date', '2026-09-08')
            ->assertJsonPath('data.hydration_week.total_ml', 3000)
            ->assertJsonPath('data.hydration_week.average_daily_ml', 1500)
            ->assertJsonCount(7, 'data.hydration_week.days')
            ->assertJsonPath('data.hydration_week.days.1.total_ml', 0)
            ->assertJsonPath('data.hydration_week.days.2.total_ml', 0);
        $this->travelTo(CarbonImmutable::parse('2026-09-14T15:00:00Z'));
        $this->getJson('/api/v1/people/'.$owner->id)->assertOk()
            ->assertJsonPath('data.hydration_week.starts_on', '2026-09-14')
            ->assertJsonPath('data.hydration_week.average_daily_ml', 0);
    }

    private function member(string $username): User
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => ucfirst($username), 'username' => $username, 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR']);

        return $user;
    }
}
