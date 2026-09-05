<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Group\Application\GroupService;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Application\HydrationChallengeService;
use App\Modules\Hydration\Application\RecordWaterIntake;
use App\Modules\Identity\Application\DeleteAccount;
use App\Modules\Identity\Notifications\ResetAccountPassword;
use App\Modules\Identity\Notifications\VerifyAccountEmail;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\InventoryTransaction;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use App\Shared\Application\Jobs\ProcessOutboxEvent;
use App\Shared\Infrastructure\Models\OutboxEvent;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use RuntimeException;
use Tests\TestCase;

class SoftDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_leaving_and_rejoining_preserves_membership_history_and_frees_slots(): void
    {
        $owner = $this->member();
        $group = app(GroupService::class)->create($owner, 'Maré de amigos');
        $guest = $this->member();
        Sanctum::actingAs($guest);
        $input = ['code' => $group['invite']['code'], 'accept' => true];
        $this->postJson('/api/v1/groups/invites/accept', $input)->assertOk();
        $oldMembership = GroupMembership::query()->where('user_id', $guest->id)->firstOrFail();

        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->postJson('/api/v1/groups/invites/accept', $input)->assertOk()->assertJsonCount(2, 'data.members');

        $this->assertSoftDeleted($oldMembership);
        $activeMembership = GroupMembership::query()->where('user_id', $guest->id)->firstOrFail();
        $this->assertNotSame($oldMembership->id, $activeMembership->id);
        $this->assertSame($oldMembership->slot, $activeMembership->slot);
        $this->assertSame(2, GroupMembership::withTrashed()->where('user_id', $guest->id)->count());
    }

    public function test_a_deleted_group_keeps_history_invalidates_invites_and_allows_a_new_group(): void
    {
        $user = $this->member();
        $group = app(GroupService::class)->create($user, 'Primeira maré');
        $challenge = app(HydrationChallengeService::class)->start($user, 'group');
        Sanctum::actingAs($user);

        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();

        $this->assertSoftDeleted('groups', ['id' => $group['id']]);
        $this->assertSoftDeleted($challenge);
        $this->assertSoftDeleted('group_memberships', ['group_id' => $group['id'], 'user_id' => $user->id]);
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $group['invite']['code']])->assertNotFound();
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertNotFound();
        $new = $this->postJson('/api/v1/groups', ['name' => 'Segunda maré'])->assertCreated()->json('data');
        $this->assertNotSame($group['id'], $new['id']);
        $this->assertSame(2, Group::withTrashed()->where('owner_id', $user->id)->count());
    }

    public function test_deleting_a_group_also_soft_deletes_its_memberships(): void
    {
        $owner = $this->member();
        $group = app(GroupService::class)->create($owner, 'Maré de amigos');
        $guest = $this->member();
        app(GroupService::class)->accept($guest, $group['invite']['code']);
        $model = Group::query()->findOrFail($group['id']);

        $model->delete();

        $this->assertSoftDeleted($model);
        $this->assertSame(0, $model->memberships()->count());
        $this->assertSame(2, $model->memberships()->onlyTrashed()->count());
        $this->assertNull(app(GroupService::class)->current($guest));
        $this->assertSame($guest->id, app(GroupService::class)->create($guest, 'Outra equipe')['owner_id']);
    }

    #[TestWith(['user'])]
    #[TestWith(['slot'])]
    public function test_active_membership_uniqueness_remains_enforced_by_the_database(string $key): void
    {
        $owner = $this->member();
        $group = app(GroupService::class)->create($owner, 'Maré de amigos');
        $other = $this->member();
        $this->expectException(QueryException::class);

        GroupMembership::query()->create([
            'group_id' => $group['id'], 'user_id' => $key === 'user' ? $owner->id : $other->id,
            'slot' => $key === 'slot' ? '1' : '2',
        ]);
    }

    public function test_deleting_account_archives_all_owned_data_without_affecting_another_account(): void
    {
        $user = $this->member();
        $other = $this->member();
        $group = app(GroupService::class)->create($user, 'Maré de amigos');
        $log = app(RecordWaterIntake::class)->handle($user, [
            'client_event_id' => fake()->uuid(), 'amount_ml' => 250, 'source' => 'app',
        ])['log'];
        $balance = InventoryBalance::factory()->create(['user_id' => $user->id]);
        $transaction = InventoryTransaction::factory()->create(['user_id' => $user->id]);
        $effect = StreakPotionEffect::factory()->create(['user_id' => $user->id]);
        $block = PotionUsageBlock::factory()->create(['user_id' => $user->id]);
        $event = OutboxEvent::query()->where('aggregate_id', $log->id)->firstOrFail();
        $challenge = app(HydrationChallengeService::class)->start($user, 'solo');
        $records = [$user, $user->profile, $user->hydrationGoals()->firstOrFail(), $log,
            $user->dailyStats()->firstOrFail(), $user->streak()->firstOrFail(), $balance, $transaction, $effect, $block,
            $user->achievements()->firstOrFail(), Group::query()->findOrFail($group['id']),
            GroupMembership::query()->where('user_id', $user->id)->firstOrFail(), $event, $challenge];
        $otherToken = $other->createToken('other phone');
        $token = $user->createToken('phone')->plainTextToken;
        Password::createToken($user);
        DB::table('sessions')->insert(['id' => 'deleted-session', 'user_id' => $user->id, 'payload' => 'data', 'last_activity' => time()]);

        $this->withToken($token)->deleteJson('/api/v1/me')->assertNoContent();

        foreach ($records as $record) {
            $this->assertSoftDeleted($record);
            $this->assertNull($record->newQuery()->find($record->getKey()));
        }
        $this->assertNotSoftDeleted($other);
        $this->assertNotSoftDeleted($other->profile);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_deleted_identifiers_can_be_registered_again_but_old_links_cannot_access_the_new_account(): void
    {
        Notification::fake();
        $user = $this->member();
        $username = $user->profile->username;
        $verificationUrl = (new VerifyAccountEmail($user))->url;
        $resetToken = Password::createToken($user);
        app(AchievementService::class)->grant($user, 'first_reminder');
        app(DeleteAccount::class)->handle($user);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'oldSenha123'])->assertUnprocessable();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertAccepted();
        Notification::assertNothingSent();
        $this->getJson('/api/v1/auth/username-availability?username='.$username)->assertJsonPath('data.available', true);

        $result = $this->postJson('/api/v1/auth/register', [
            'email' => $user->email, 'username' => $username, 'password' => 'newSenha123', 'password_confirmation' => 'newSenha123',
            'display_name' => 'Nova conta', 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR',
            'terms_accepted' => true, 'terms_version' => '2026-09-02',
        ])->assertCreated()->assertJsonPath('data.user.email_verified_at', null);

        $newUser = User::query()->findOrFail($result->json('data.user.id'));
        $this->assertNotSame($user->id, $newUser->id);
        $this->assertSame(0, $newUser->achievements()->count());
        $this->assertSoftDeleted($user);
        $this->get($verificationUrl)->assertForbidden();
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => $resetToken, 'password' => 'invader123', 'password_confirmation' => 'invader123',
        ])->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_RESET_INVALID');
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'newSenha123'])->assertOk();
        $this->assertNull($newUser->fresh()->email_verified_at);
    }

    public function test_updating_a_username_can_reuse_a_deleted_profile_but_not_an_active_one(): void
    {
        $deleted = $this->member();
        $username = $deleted->profile->username;
        app(DeleteAccount::class)->handle($deleted);
        $user = $this->member();
        $other = $this->member();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/profile', ['username' => $username])->assertOk()->assertJsonPath('data.username', $username);
        $this->patchJson('/api/v1/me/profile', ['username' => $other->profile->username])->assertUnprocessable();

        $this->assertSoftDeleted($deleted->profile);
        $this->assertSame($username, $user->profile->fresh()->username);
    }

    #[TestWith(['email'])]
    #[TestWith(['username'])]
    public function test_active_account_identifiers_remain_unique_at_database_level(string $key): void
    {
        $user = $this->member();
        $other = $this->member();
        $this->expectException(QueryException::class);

        if ($key === 'email') {
            $other->update(['email' => $user->email]);
        } else {
            $other->profile->update(['username' => $user->profile->username]);
        }
    }

    public function test_deleted_outbox_events_are_not_dispatched_or_processed(): void
    {
        Queue::fake();
        $user = $this->member();
        $event = OutboxEvent::query()->create([
            'type' => 'hydration.log.created.v1', 'aggregate_id' => $user->id,
            'payload' => ['user_id' => $user->id], 'available_at' => now(),
        ]);
        $event->delete();

        $this->artisan('outbox:dispatch')->assertSuccessful();
        (new ProcessOutboxEvent($event->id))->handle();

        Queue::assertNothingPushed();
        $this->assertNull($event->fresh()->processed_at);
        $this->assertSoftDeleted($event);
    }

    public function test_queued_account_emails_are_suppressed_after_soft_deletion(): void
    {
        config(['mail.default' => 'array']);
        $user = $this->member();
        $user->forceFill(['email_verified_at' => null])->save();
        $verification = new VerifyAccountEmail($user);
        $reset = new ResetAccountPassword(str_repeat('a', 64), $user);
        app(DeleteAccount::class)->handle($user);
        $deleted = User::withTrashed()->findOrFail($user->id);

        Notification::sendNow($deleted, $verification);
        Notification::sendNow($deleted, $reset);

        $this->assertCount(0, Mail::getSymfonyTransport()->messages());
    }

    public function test_deletion_failure_rolls_back_archival_and_credential_revocation(): void
    {
        $user = $this->member();
        $group = app(GroupService::class)->create($user, 'Maré de amigos');
        $token = $user->createToken('phone');
        $event = 'eloquent.deleting: '.User::class;
        Event::listen($event, fn () => throw new RuntimeException('Deletion failed'));
        try {
            app(DeleteAccount::class)->handle($user);
            $this->fail('The deletion should have failed.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Deletion failed', $exception->getMessage());
        } finally {
            Event::forget($event);
        }

        $this->assertNotSoftDeleted($user);
        $this->assertNotSoftDeleted($user->profile);
        $this->assertNotSoftDeleted('groups', ['id' => $group['id']]);
        $this->assertNotSoftDeleted('group_memberships', ['user_id' => $user->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->accessToken->id]);
    }

    public function test_rollback_refuses_to_erase_existing_deletion_history(): void
    {
        $user = $this->member();
        app(DeleteAccount::class)->handle($user);
        $migration = require database_path('migrations/2026_09_05_003014_add_soft_deletes_to_domain_tables.php');
        try {
            $migration->down();
            $this->fail('The rollback must preserve deletion history.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('deleted records exist', $exception->getMessage());
        }

        $this->assertTrue(Schema::hasColumn('users', 'deleted_at'));
        $this->assertSoftDeleted($user);
    }

    private function member(): User
    {
        $user = User::factory()->create(['password' => 'oldSenha123']);
        $user->profile()->create([
            'display_name' => 'Ana', 'username' => fake()->unique()->regexify('[a-z]{12}'),
            'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR',
        ]);
        $user->hydrationGoals()->create(['daily_goal_ml' => 2000, 'starts_on' => now()->toDateString(), 'source' => 'onboarding']);

        return $user;
    }
}
