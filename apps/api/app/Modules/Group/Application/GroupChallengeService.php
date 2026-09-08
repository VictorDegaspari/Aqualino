<?php

namespace App\Modules\Group\Application;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupChallengeParticipant;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Inventory\Application\CreditInventoryItem;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Random\Randomizer;

class GroupChallengeService
{
    public function __construct(
        private readonly GroupChallengeScoring $scoring,
        private readonly CreditInventoryItem $inventory,
        private readonly AchievementService $achievements,
        private readonly Randomizer $random,
    ) {}

    /** @return array{gold: int, silver: int, bronze: int} */
    public function medalCounts(User $user): array
    {
        $counts = GroupChallengeParticipant::withTrashed()->where('user_id', $user->id)
            ->whereNotNull('final_progress')->whereNotNull('medal')
            ->selectRaw('medal, COUNT(*) as total')->groupBy('medal')->pluck('total', 'medal');

        return ['gold' => (int) ($counts['gold'] ?? 0), 'silver' => (int) ($counts['silver'] ?? 0), 'bronze' => (int) ($counts['bronze'] ?? 0)];
    }

    public function current(Group $group, User $viewer): array
    {
        $this->advance($group);
        $latest = HydrationChallenge::query()->where('group_id', $group->id)->latest('starts_at')->latest('id')->first();
        $result = HydrationChallenge::query()->where('group_id', $group->id)->whereNotNull('finalized_at')->latest('starts_at')->first();
        $settling = HydrationChallenge::query()->where('group_id', $group->id)->whereNull('finalized_at')->whereNull('cancelled_at')
            ->where('ends_at', '<=', now())->latest('starts_at')->first();

        return [
            'group' => $latest ? $this->payload($latest, $viewer) : null,
            'group_result' => ($settling ?? $result) ? $this->payload($settling ?? $result, $viewer) : null,
            'group_rules' => GroupChallengeScoring::RULES,
        ];
    }

    public function start(Group $group): HydrationChallenge
    {
        $this->advance($group);
        $existing = HydrationChallenge::query()->where('group_id', $group->id)->whereNull('cancelled_at')
            ->where('ends_at', '>', now())->first();
        if ($existing) {
            return $existing;
        }
        if ($group->memberships()->count() < 2) {
            throw ValidationException::withMessages(['challenge' => ['Convide pelo menos mais uma pessoa para iniciar o desafio do grupo.']]);
        }

        return $this->schedule($group, CarbonImmutable::now($group->timezone)->addDay()->startOfDay()->utc());
    }

    public function prepareForUser(User $user): void
    {
        $membership = GroupMembership::query()->where('user_id', $user->id)->first();
        $group = $membership ? Group::query()->find($membership->group_id) : null;
        if ($group) {
            $this->advance($group);
        }
    }

    public function advance(Group $group): void
    {
        DB::transaction(function () use ($group): void {
            $group = Group::withTrashed()->whereKey($group->id)->lockForUpdate()->first();
            if (! $group) {
                return;
            }
            if ($group->trashed()) {
                $pending = HydrationChallenge::withTrashed()->where('group_id', $group->id)->where('mode', 'group')
                    ->whereNull('finalized_at')->whereNull('cancelled_at')->whereNotNull('roster_locked_at')
                    ->where('ends_at', '<=', now())->get();
                foreach ($pending as $challenge) {
                    if (now()->greaterThanOrEqualTo($this->deadline($challenge))) {
                        $this->finalize($challenge);
                    }
                }

                return;
            }
            // Catch up in bounded batches if the scheduler was unavailable.
            for ($window = 0; $window < 8; $window++) {
                $challenge = HydrationChallenge::query()->where('group_id', $group->id)->where('mode', 'group')
                    ->whereNull('finalized_at')->whereNull('cancelled_at')->oldest('starts_at')->first();
                if (! $challenge) {
                    return;
                }
                if (! $challenge->rules) {
                    $challenge->update(['rules' => GroupChallengeScoring::RULES]);
                }
                if (now()->lessThan($challenge->starts_at)) {
                    return;
                }
                if (! $challenge->roster_locked_at) {
                    $this->lockRoster($group, $challenge);
                }
                if ($challenge->cancelled_at) {
                    continue;
                }
                if (now()->lessThan($challenge->ends_at)) {
                    return;
                }
                if (now()->greaterThanOrEqualTo($this->deadline($challenge))) {
                    $this->finalize($challenge);
                }
                $nextExists = HydrationChallenge::withTrashed()->where('group_id', $group->id)
                    ->where('starts_at', $challenge->ends_at)->exists();
                if (! $nextExists && $this->membersAt($group, $challenge->ends_at)->count() >= 2) {
                    $next = $this->schedule($group, $challenge->ends_at);
                    $this->lockRoster($group, $next);
                }
                if (! $challenge->finalized_at) {
                    return;
                }
            }
        }, 3);
    }

    public function payload(HydrationChallenge $challenge, User $viewer): array
    {
        $participants = $challenge->roster_locked_at
            ? $challenge->participants()->withTrashed()->with('user.profile')->get()
            : $this->previewParticipants($challenge);
        $rows = $this->scoring->standings($challenge, $participants);
        $own = $rows->first(fn (array $row): bool => $row['participant']->user_id === $viewer->id);
        $progress = $own['progress'] ?? $this->scoring->progress($challenge, 2000, collect());
        $progress['current_date'] = CarbonImmutable::now($challenge->timezone)->toDateString();
        $progress['days'] = array_map(function (array $day) use ($progress): array {
            $day['is_today'] = $day['date'] === $progress['current_date'];
            unset($day['points_hundredths']);

            return $day;
        }, $progress['days']);
        $status = $challenge->cancelled_at ? 'cancelled' : ($challenge->finalized_at ? 'completed'
            : (now()->lessThan($challenge->starts_at) ? 'scheduled' : (now()->lessThan($challenge->ends_at) ? 'active' : 'settling')));
        $participant = $own['participant'] ?? null;

        return [
            'id' => $challenge->id, 'group_id' => $challenge->group_id, 'mode' => 'group', 'status' => $status,
            'starts_at' => $challenge->starts_at->utc()->toIso8601String(), 'ends_at' => $challenge->ends_at->utc()->toIso8601String(),
            'sync_deadline_at' => $challenge->ends_at->addMinutes($challenge->rules['sync_grace_minutes'])->utc()->toIso8601String(),
            'review_deadline_at' => $this->deadline($challenge)->utc()->toIso8601String(),
            'finalized_at' => $challenge->finalized_at?->utc()->toIso8601String(),
            'rules' => $challenge->rules, 'participating' => $participant !== null && ! $challenge->cancelled_at,
            'progress' => $progress,
            'reward' => $participant?->reward_granted_at ? [
                'state' => 'claimed', 'type' => $participant->reward_type, 'amount' => $participant->reward_amount,
            ] : null,
            'leaderboard' => $rows->map(fn (array $row): array => [
                'user_id' => $row['participant']->user_id,
                'display_name' => $row['participant']->user?->profile?->display_name ?? 'Conta excluída',
                'avatar_url' => $row['participant']->user?->profile?->avatar_url,
                'is_you' => $row['participant']->user_id === $viewer->id,
                'total_ml' => $row['progress']['total_ml'], 'goal_ml' => $row['participant']->goal_ml,
                'percentage' => round($row['points_hundredths'] / 700, 2), 'points' => $row['points_hundredths'] / 100,
                'rank' => $row['rank'], 'tied' => $row['tied'], 'medal' => $row['medal'],
            ])->all(),
        ];
    }

    private function schedule(Group $group, CarbonImmutable $startsAt): HydrationChallenge
    {
        $challenge = HydrationChallenge::query()->create([
            'mode' => 'group', 'group_id' => $group->id, 'timezone' => $group->timezone,
            'starts_at' => $startsAt, 'ends_at' => $startsAt->setTimezone($group->timezone)->addDays(7)->utc(),
            'rules' => GroupChallengeScoring::RULES,
        ]);
        foreach ($group->memberships()->get() as $membership) {
            $this->blockPotions($challenge, $membership->user_id);
        }

        return $challenge;
    }

    private function membersAt(Group $group, CarbonImmutable $moment): Collection
    {
        return GroupMembership::withTrashed()->where('group_id', $group->id)
            ->where('created_at', '<=', $moment)
            ->where(fn ($query) => $query->whereNull('deleted_at')->orWhere('deleted_at', '>', $moment))
            ->with('user.profile')->orderBy('user_id')->get()->unique('user_id')->filter(fn ($member) => $member->user !== null)->values();
    }

    private function goalAt(User $user, HydrationChallenge $challenge): int
    {
        $date = $challenge->starts_at->setTimezone($user->profile?->timezone ?? $challenge->timezone)->toDateString();

        return max(1, HydrationGoal::query()->where('user_id', $user->id)->whereDate('starts_on', '<=', $date)
            ->latest('starts_on')->first()?->daily_goal_ml ?? 2000);
    }

    private function lockRoster(Group $group, HydrationChallenge $challenge): void
    {
        $members = $this->membersAt($group, $challenge->starts_at);
        if ($members->count() < 2) {
            $challenge->update(['cancelled_at' => now(), 'roster_locked_at' => now()]);
            PotionUsageBlock::query()->where('context_id', $challenge->id)->delete();

            return;
        }
        foreach ($members as $member) {
            $challenge->participants()->firstOrCreate(['user_id' => $member->user_id], ['goal_ml' => $this->goalAt($member->user, $challenge)]);
            $this->blockPotions($challenge, $member->user_id);
        }
        PotionUsageBlock::query()->where('context_id', $challenge->id)->whereNotIn('user_id', $members->pluck('user_id'))->delete();
        $challenge->update(['roster_locked_at' => now()]);
    }

    private function previewParticipants(HydrationChallenge $challenge): Collection
    {
        return GroupMembership::query()->where('group_id', $challenge->group_id)->with('user.profile')->get()
            ->filter(fn ($member) => $member->user !== null)->map(function (GroupMembership $member) use ($challenge): GroupChallengeParticipant {
                $participant = new GroupChallengeParticipant(['user_id' => $member->user_id, 'goal_ml' => $this->goalAt($member->user, $challenge)]);
                $participant->setRelation('user', $member->user);

                return $participant;
            });
    }

    private function blockPotions(HydrationChallenge $challenge, string $userId): void
    {
        PotionUsageBlock::query()->firstOrCreate([
            'user_id' => $userId, 'context_id' => $challenge->id, 'reason' => 'group_challenge',
        ], ['starts_at' => $challenge->starts_at, 'ends_at' => $challenge->ends_at->subSecond()]);
    }

    private function deadline(HydrationChallenge $challenge): CarbonImmutable
    {
        $syncDeadline = $challenge->ends_at->addMinutes($challenge->rules['sync_grace_minutes']);
        $reviewDeadline = HydrationLog::query()->awaitingReview()
            ->whereIn('user_id', $challenge->participants()->withTrashed()->select('user_id'))
            ->where('occurred_at', '>=', $challenge->starts_at)->where('occurred_at', '<', $challenge->ends_at)
            ->where('created_at', '<', $syncDeadline)->max('review_expires_at');

        return $reviewDeadline && CarbonImmutable::parse($reviewDeadline)->greaterThan($syncDeadline)
            ? CarbonImmutable::parse($reviewDeadline) : $syncDeadline;
    }

    private function finalize(HydrationChallenge $challenge): void
    {
        $participants = $challenge->participants()->withTrashed()->get();
        // Serialize against hydration writes and account deletion before taking the final snapshot.
        $users = User::query()->whereIn('id', $participants->pluck('user_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $rows = $this->scoring->standings($challenge, $participants);
        $challenge->update(['finalized_at' => now()]);
        foreach ($rows as $row) {
            $participant = $row['participant'];
            $participant->update([
                'final_progress' => $row['progress'], 'points_hundredths' => $row['points_hundredths'],
                'rank' => $row['rank'], 'tied' => $row['tied'], 'medal' => $row['medal'],
            ]);
            $user = $users->get($participant->user_id);
            if ($row['rank'] !== 1 || ! $user || $participant->reward_granted_at) {
                continue;
            }
            $draw = $this->random->getInt(1, 100);
            foreach ($challenge->rules['rewards'] as $reward) {
                $draw -= $reward['probability'];
                if ($draw > 0) {
                    continue;
                }
                if ($reward['type'] === 'xp') {
                    $user->increment('xp_total', $reward['amount']);
                    $this->achievements->reconcile($user);
                } else {
                    $this->inventory->handle($user, InventoryItemCode::from($reward['type']), $reward['amount'],
                        InventoryTransactionSource::GroupFirstPlaceReward, $challenge->id, ['rules_version' => $challenge->rules['version']]);
                }
                $participant->update(['reward_type' => $reward['type'], 'reward_amount' => $reward['amount'], 'reward_granted_at' => now()]);
                break;
            }
        }
    }
}
