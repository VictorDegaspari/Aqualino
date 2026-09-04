<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class GroupControllerTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['GET', '/api/v1/groups/current'])]
    #[TestWith(['POST', '/api/v1/groups'])]
    #[TestWith(['POST', '/api/v1/groups/invites/preview'])]
    #[TestWith(['POST', '/api/v1/groups/invites/accept'])]
    #[TestWith(['POST', '/api/v1/groups/current/invite'])]
    #[TestWith(['DELETE', '/api/v1/groups/current/membership'])]
    public function test_requires_authentication(string $method, string $path): void
    {
        $this->json($method, $path)->assertUnauthorized()->assertJsonPath('error.code', 'AUTHENTICATION_REQUIRED');
    }

    public function test_creates_a_private_group_with_the_creator_and_protected_invite(): void
    {
        $owner = $this->member('Ana');
        Sanctum::actingAs($owner);
        $this->getJson('/api/v1/groups/current')->assertOk()->assertExactJson(['data' => null]);
        $response = $this->postJson('/api/v1/groups', ['name' => '  Maré de amigos  ', 'owner_id' => 'ignored', 'timezone' => 'Asia/Tokyo']);
        $response->assertCreated()->assertJsonPath('data.name', 'Maré de amigos')
            ->assertJsonPath('data.owner_id', $owner->id)
            ->assertJsonPath('data.timezone', 'America/Sao_Paulo')
            ->assertJsonCount(1, 'data.members')
            ->assertJsonPath('data.members.0.role', 'owner')
            ->assertJsonPath('data.members.0.display_name', 'Ana')
            ->assertJsonMissingPath('data.members.0.email')
            ->assertJsonMissingPath('data.invite_code_hash');
        $code = $response->json('data.invite.code');
        $stored = DB::table('groups')->first();
        $this->assertNotSame($code, $stored->invite_code);
        $this->assertSame(hash('sha256', $code), $stored->invite_code_hash);
        $this->getJson('/api/v1/groups/current')->assertOk()->assertJsonPath('data.id', $response->json('data.id'));
    }

    #[TestWith([''])]
    #[TestWith(['  '])]
    #[TestWith(['ab'])]
    #[TestWith([61])]
    public function test_rejects_invalid_names(string|int $name): void
    {
        Sanctum::actingAs($this->member('Ana'));
        $this->postJson('/api/v1/groups', ['name' => is_int($name) ? str_repeat('a', $name) : $name])
            ->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');
        $this->assertDatabaseCount('groups', 0);
    }

    public function test_preview_discloses_no_members_and_acceptance_is_explicit_and_repeatable(): void
    {
        $group = $this->createGroup($this->member('Ana'));
        $guest = $this->member('Bruno');
        Sanctum::actingAs($guest);
        $input = ['code' => strtolower($group['invite']['code'])];
        $this->postJson('/api/v1/groups/invites/preview', $input)->assertOk()
            ->assertJsonPath('data.name', $group['name'])->assertJsonPath('data.member_count', 1)
            ->assertJsonMissingPath('data.members')->assertJsonMissingPath('data.owner_id')->assertJsonMissingPath('data.invite');
        $this->getJson('/api/v1/groups/current')->assertExactJson(['data' => null]);
        $this->postJson('/api/v1/groups/invites/accept', $input)->assertUnprocessable();
        $this->postJson('/api/v1/groups/invites/accept', [...$input, 'accept' => false])->assertUnprocessable();
        $this->assertDatabaseCount('group_memberships', 1);
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $this->postJson('/api/v1/groups/invites/accept', [...$input, 'accept' => true])->assertOk()
                ->assertJsonCount(2, 'data.members')->assertJsonPath('data.invite', null);
        }
        $this->assertDatabaseCount('group_memberships', 2);
        $this->getJson('/api/v1/groups/current')->assertJsonPath('data.id', $group['id']);
    }

    public function test_rejects_a_sixth_member_and_reuses_a_vacated_slot(): void
    {
        $group = $this->createGroup($this->member('Ana'));
        $members = [];
        for ($i = 0; $i < 4; $i++) {
            $members[] = $member = $this->member('Friend '.$i);
            Sanctum::actingAs($member);
            $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        }
        $sixth = $this->member('Sixth');
        Sanctum::actingAs($sixth);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])
            ->assertConflict()->assertJsonPath('error.code', 'GROUP_FULL');
        $this->assertDatabaseCount('group_memberships', 5);
        Sanctum::actingAs($members[1]);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        Sanctum::actingAs($sixth);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])
            ->assertOk()->assertJsonCount(5, 'data.members');
    }

    public function test_a_person_cannot_create_or_join_a_second_group(): void
    {
        $owner = $this->member('Ana');
        $first = $this->createGroup($owner);
        $second = $this->createGroup($this->member('Bruno'));
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/groups', ['name' => 'Another group'])->assertConflict()->assertJsonPath('error.code', 'GROUP_ALREADY_JOINED');
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $second['invite']['code'], 'accept' => true])
            ->assertConflict()->assertJsonPath('error.code', 'GROUP_ALREADY_JOINED');
        $this->getJson('/api/v1/groups/current')->assertJsonPath('data.id', $first['id']);
        $this->assertDatabaseCount('group_memberships', 2);
    }

    public function test_only_the_owner_can_replace_invites_and_expiration_is_enforced(): void
    {
        $owner = $this->member('Ana');
        $group = $this->createGroup($owner);
        Sanctum::actingAs($this->member('Bruno'));
        $this->postJson('/api/v1/groups/current/invite')->assertForbidden();
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        $this->postJson('/api/v1/groups/current/invite')->assertForbidden()->assertJsonPath('error.code', 'GROUP_OWNER_REQUIRED');
        Sanctum::actingAs($owner);
        $newCode = $this->postJson('/api/v1/groups/current/invite')->assertOk()->json('data.invite.code');
        $this->assertNotSame($group['invite']['code'], $newCode);
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $group['invite']['code']])->assertNotFound();
        $this->travel(7)->days();
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $newCode])->assertNotFound()->assertJsonPath('error.code', 'GROUP_INVITE_INVALID');
        Sanctum::actingAs($this->member('Carla'));
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $newCode, 'accept' => true])->assertNotFound();
        $this->travelBack();
    }

    public function test_owner_leaving_transfers_responsibility_and_revokes_the_old_invite(): void
    {
        $owner = $this->member('Ana');
        $group = $this->createGroup($owner);
        $nextOwner = $this->member('Bruno');
        Sanctum::actingAs($nextOwner);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        Sanctum::actingAs($owner);
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk()->assertExactJson(['data' => null]);
        $this->getJson('/api/v1/groups/current')->assertExactJson(['data' => null]);
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $group['invite']['code']])->assertNotFound();
        Sanctum::actingAs($nextOwner);
        $this->getJson('/api/v1/groups/current')->assertJsonPath('data.owner_id', $nextOwner->id)->assertJsonPath('data.members.0.role', 'owner');
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->deleteJson('/api/v1/groups/current/membership')->assertOk();
        $this->assertDatabaseCount('groups', 0);
        $this->assertDatabaseCount('group_memberships', 0);
    }

    public function test_invitation_attempts_are_rate_limited(): void
    {
        Sanctum::actingAs($this->member('Ana'));
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/groups/invites/preview', ['code' => 'INVALID12345'])->assertNotFound();
        }
        $this->postJson('/api/v1/groups/invites/preview', ['code' => 'INVALID12345'])->assertTooManyRequests();
    }

    public function test_deleting_the_owner_account_preserves_the_other_members_group(): void
    {
        $owner = $this->member('Ana');
        $group = $this->createGroup($owner);
        $other = $this->member('Bruno');
        Sanctum::actingAs($other);
        $this->postJson('/api/v1/groups/invites/accept', ['code' => $group['invite']['code'], 'accept' => true])->assertOk();
        Sanctum::actingAs($owner);
        $this->deleteJson('/api/v1/me')->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $owner->id]);
        Sanctum::actingAs($other);
        $this->getJson('/api/v1/groups/current')->assertOk()->assertJsonPath('data.id', $group['id'])
            ->assertJsonPath('data.owner_id', $other->id)->assertJsonCount(1, 'data.members');
    }

    #[TestWith(['short'])]
    #[TestWith(['!!!!!!!!!!!!'])]
    #[TestWith([['ABC123DEF456']])]
    public function test_rejects_malformed_invitation_codes(mixed $code): void
    {
        Sanctum::actingAs($this->member('Ana'));
        $this->postJson('/api/v1/groups/invites/preview', ['code' => $code])
            ->assertUnprocessable()->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }

    public function test_database_rejects_a_membership_outside_the_five_slots(): void
    {
        $group = $this->createGroup($this->member('Ana'));
        $user = $this->member('Bruno');
        $this->expectException(QueryException::class);
        GroupMembership::query()->create([
            'group_id' => $group['id'], 'user_id' => $user->id, 'slot' => '6',
        ]);
    }

    private function member(string $name): User
    {
        $user = User::factory()->create();
        $user->profile()->create([
            'display_name' => $name, 'username' => fake()->unique()->userName(),
            'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR', 'avatar_url' => 'avatar_2',
        ]);

        return $user;
    }

    private function createGroup(User $owner): array
    {
        Sanctum::actingAs($owner);

        return $this->postJson('/api/v1/groups', ['name' => 'Maré de amigos'])->assertCreated()->json('data');
    }
}
