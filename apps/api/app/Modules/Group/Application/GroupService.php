<?php

namespace App\Modules\Group\Application;

use App\Models\User;
use App\Modules\Group\Domain\GroupException;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class GroupService
{
    public function current(User $user): ?array
    {
        return DB::transaction(function () use ($user): ?array {
            $this->lockUser($user);
            $group = $this->currentGroup($user);

            return $group ? $this->payload($group, $user) : null;
        }, 3);
    }

    public function create(User $user, string $name): array
    {
        return DB::transaction(function () use ($user, $name): array {
            $this->lockUser($user);
            if ($this->currentGroup($user)) {
                throw new GroupException('GROUP_ALREADY_JOINED', 'Você já participa de um grupo.');
            }

            $group = Group::query()->create([
                'owner_id' => $user->id,
                'name' => $name,
                'timezone' => $user->profile?->timezone ?? 'UTC',
                ...$this->newInvite(),
            ]);
            $group->memberships()->create(['user_id' => $user->id, 'slot' => '1']);

            return $this->payload($group, $user);
        }, 3);
    }

    public function preview(string $code): array
    {
        $group = $this->invitedGroup($code);

        return [
            'name' => $group->name,
            'timezone' => $group->timezone,
            'member_count' => $group->memberships()->count(),
            'max_members' => 5,
            'expires_at' => $group->invite_expires_at->toIso8601String(),
        ];
    }

    public function accept(User $user, string $code): array
    {
        return DB::transaction(function () use ($user, $code): array {
            $this->lockUser($user);
            $group = $this->invitedGroup($code, true);
            $membership = GroupMembership::query()->where('user_id', $user->id)->first();
            if ($membership) {
                if ($membership->group_id === $group->id) {
                    return $this->payload($group, $user);
                }
                throw new GroupException('GROUP_ALREADY_JOINED', 'Você já participa de um grupo.');
            }

            $usedSlots = $group->memberships()->pluck('slot')->all();
            $slot = collect(['1', '2', '3', '4', '5'])->first(fn (string $value): bool => ! in_array($value, $usedSlots));
            if ($slot === null) {
                throw new GroupException('GROUP_FULL', 'Este grupo já tem cinco integrantes.');
            }
            $group->memberships()->create(['user_id' => $user->id, 'slot' => $slot]);

            return $this->payload($group, $user);
        }, 3);
    }

    public function renewInvite(User $user): array
    {
        return DB::transaction(function () use ($user): array {
            $this->lockUser($user);
            $group = $this->currentGroup($user);
            if (! $group || $group->owner_id !== $user->id) {
                throw new GroupException('GROUP_OWNER_REQUIRED', 'Somente o responsável pode gerar convites.', 403);
            }
            $group->update($this->newInvite());

            return $this->payload($group, $user);
        }, 3);
    }

    public function leave(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $this->lockUser($user);
            $group = $this->currentGroup($user);
            if (! $group) {
                return;
            }
            $group->memberships()->where('user_id', $user->id)->delete();
            $nextOwner = $group->memberships()->oldest('id')->first();
            if (! $nextOwner) {
                $group->delete();
            } elseif ($group->owner_id === $user->id) {
                $group->update(['owner_id' => $nextOwner->user_id, ...$this->newInvite()]);
            }
        }, 3);
    }

    private function lockUser(User $user): void
    {
        User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
    }

    private function currentGroup(User $user): ?Group
    {
        $membership = GroupMembership::query()->where('user_id', $user->id)->first();

        return $membership ? Group::query()->lockForUpdate()->find($membership->group_id) : null;
    }

    private function invitedGroup(string $code, bool $lock = false): Group
    {
        $query = Group::query()->where('invite_code_hash', hash('sha256', $code));
        if ($lock) {
            $query->lockForUpdate();
        }
        $group = $query->first();
        if (! $group || $group->invite_expires_at->lessThanOrEqualTo(now())) {
            throw new GroupException('GROUP_INVITE_INVALID', 'O convite é inválido ou expirou.', 404);
        }

        return $group;
    }

    private function newInvite(): array
    {
        $code = strtoupper(Str::random(12));

        return [
            'invite_code' => $code,
            'invite_code_hash' => hash('sha256', $code),
            'invite_expires_at' => now()->addDays(7),
        ];
    }

    private function payload(Group $group, User $viewer): array
    {
        $members = $group->memberships()->with('user.profile')->orderBy('slot')->get();

        return [
            'id' => $group->id,
            'name' => $group->name,
            'timezone' => $group->timezone,
            'owner_id' => $group->owner_id,
            'max_members' => 5,
            'members' => $members->map(fn (GroupMembership $member): array => [
                'user_id' => $member->user_id,
                'display_name' => $member->user->profile?->display_name ?? 'Aqualino',
                'avatar_url' => $member->user->profile?->avatar_url,
                'role' => $member->user_id === $group->owner_id ? 'owner' : 'member',
            ])->all(),
            'invite' => $group->owner_id === $viewer->id ? [
                'code' => $group->invite_code,
                'expires_at' => $group->invite_expires_at->toIso8601String(),
            ] : null,
        ];
    }
}
