<?php

namespace App\Console\Commands;

use App\Modules\Group\Application\GroupChallengeService;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use Illuminate\Console\Command;

class AdvanceGroupChallenges extends Command
{
    protected $signature = 'groups:advance-challenges';

    protected $description = 'Lock group rosters, finalize standings and grant each winner one reward';

    public function handle(GroupChallengeService $challenges): int
    {
        Group::withTrashed()->whereIn('id', HydrationChallenge::withTrashed()->select('group_id')
            ->where('mode', 'group')->whereNull('finalized_at')->whereNull('cancelled_at')
            ->where(fn ($query) => $query->whereNull('deleted_at')->orWhereNotNull('roster_locked_at')))
            ->chunkById(100, function ($groups) use ($challenges): void {
                foreach ($groups as $group) {
                    $challenges->advance($group);
                }
            });

        return self::SUCCESS;
    }
}
