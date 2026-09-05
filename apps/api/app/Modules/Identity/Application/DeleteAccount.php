<?php

namespace App\Modules\Identity\Application;

use App\Models\User;
use App\Modules\Group\Application\GroupService;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use App\Shared\Infrastructure\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;

final class DeleteAccount
{
    public function __construct(private readonly GroupService $groups) {}

    public function handle(User $account): void
    {
        DB::transaction(function () use ($account): void {
            $user = User::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
            $this->groups->leave($user);

            // SQL cascades do not run on soft deletion. Archive owned records
            // explicitly while preserving the group of the remaining members.
            $user->profile()->delete();
            $user->hydrationGoals()->delete();
            $user->hydrationLogs()->delete();
            $user->dailyStats()->delete();
            $user->streak()->delete();
            $user->inventoryBalances()->delete();
            $user->inventoryTransactions()->delete();
            $user->streakPotionEffects()->delete();
            $user->potionUsageBlocks()->delete();
            $user->achievements()->delete();
            HydrationChallenge::query()->where('user_id', $user->id)->delete();
            GroupMembership::query()->where('user_id', $user->id)->delete();
            OutboxEvent::query()->where('payload->user_id', $user->id)->delete();

            // Revoke credentials, including reset links issued before this email
            // address becomes available to a new registration.
            $user->tokens()->delete();
            Password::deleteToken($user);
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
        }, 3);
    }
}
