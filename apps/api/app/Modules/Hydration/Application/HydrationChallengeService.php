<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Inventory\Application\CreditInventoryItem;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Random\Randomizer;

class HydrationChallengeService
{
    public function __construct(
        private readonly CreditInventoryItem $inventory,
        private readonly Randomizer $random,
        private readonly AchievementService $achievements,
    ) {}

    public function current(User $user): array
    {
        $membership = GroupMembership::query()->where('user_id', $user->id)->first();
        $group = $membership ? Group::query()->find($membership->group_id) : null;
        $solo = HydrationChallenge::query()->where('user_id', $user->id)->where('mode', 'solo')->latest('starts_at')->latest('id')->first();
        $shared = $group ? HydrationChallenge::query()->where('group_id', $group->id)->latest('starts_at')->latest('id')->first() : null;

        return [
            'solo' => $solo ? $this->payload($solo, $user) : null,
            'group' => $shared ? $this->payload($shared, $user) : null,
            'group_name' => $group?->name,
            'can_start_group' => $group?->owner_id === $user->id,
        ];
    }

    public function start(User $user, string $mode): HydrationChallenge
    {
        return DB::transaction(function () use ($user, $mode): HydrationChallenge {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $group = null;
            if ($mode === 'group') {
                $membership = GroupMembership::query()->where('user_id', $user->id)->first();
                $group = $membership ? Group::query()->whereKey($membership->group_id)->lockForUpdate()->first() : null;
                abort_unless($group && $group->owner_id === $user->id, 403, 'Somente o responsável pode iniciar o desafio do grupo.');
            }
            $now = CarbonImmutable::now('UTC');
            $existing = HydrationChallenge::query()->where('mode', $mode)
                ->when($group, fn ($query) => $query->where('group_id', $group->id), fn ($query) => $query->where('user_id', $user->id))
                ->where('ends_at', '>', $now)->first();
            if ($existing) {
                return $existing;
            }
            if ($mode === 'solo') {
                $previous = HydrationChallenge::query()->where('user_id', $user->id)->where('mode', 'solo')->latest('starts_at')->latest('id')->first();
                if ($previous && ! $previous->reward_claimed_at && $this->progress($previous, $user)['completed_goal_days'] === 7) {
                    throw ValidationException::withMessages(['challenge' => ['Abra seu baú antes de iniciar outro desafio.']]);
                }
            }
            $timezone = $group?->timezone ?? $user->profile->timezone;
            $startsAt = $mode === 'group' ? $now->setTimezone($timezone)->addDay()->startOfDay() : $now->setTimezone($timezone);
            $challenge = HydrationChallenge::query()->create([
                'mode' => $mode,
                'user_id' => $group ? null : $user->id,
                'group_id' => $group?->id,
                'timezone' => $timezone,
                'starts_at' => $startsAt->utc(),
                'ends_at' => $startsAt->startOfDay()->addDays(7)->utc(),
            ]);
            if ($group) {
                foreach ($group->memberships()->get() as $member) {
                    PotionUsageBlock::query()->create([
                        'user_id' => $member->user_id, 'reason' => 'group_challenge', 'context_id' => $challenge->id,
                        'starts_at' => $challenge->starts_at, 'ends_at' => $challenge->ends_at->subSecond(),
                    ]);
                }
            }

            return $challenge;
        }, 3);
    }

    public function claim(User $user, string $id): array
    {
        return DB::transaction(function () use ($user, $id): array {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $challenge = HydrationChallenge::query()->whereKey($id)->where('user_id', $user->id)
                ->where('mode', 'solo')->lockForUpdate()->firstOrFail();
            if ($challenge->reward_claimed_at) {
                return $this->payload($challenge, $user);
            }
            if ($this->progress($challenge, $user)['completed_goal_days'] !== 7) {
                throw ValidationException::withMessages(['challenge' => ['Cumpra as 7 metas diárias para abrir o baú.']]);
            }
            $type = ['xp', 'streak_freeze', 'streak_revive'][$this->random->getInt(0, 2)];
            $amount = $type === 'xp' ? 100 : 1;
            if ($type === 'xp') {
                $user->increment('xp_total', $amount);
                $this->achievements->reconcile($user);
            } else {
                $this->inventory->handle($user, InventoryItemCode::from($type), $amount, InventoryTransactionSource::SoloChallengeReward, $challenge->id);
            }
            $challenge->update(['reward_type' => $type, 'reward_amount' => $amount, 'reward_claimed_at' => CarbonImmutable::now('UTC')]);

            return $this->payload($challenge, $user);
        }, 3);
    }

    private function payload(HydrationChallenge $challenge, User $user): array
    {
        $now = CarbonImmutable::now('UTC');
        $progress = $this->progress($challenge, $user);

        return [
            'id' => $challenge->id,
            'mode' => $challenge->mode,
            'status' => $now->lessThan($challenge->starts_at) ? 'scheduled' : ($now->lessThan($challenge->ends_at) ? 'active' : 'completed'),
            'starts_at' => $challenge->starts_at->utc()->toIso8601String(),
            'ends_at' => $challenge->ends_at->utc()->toIso8601String(),
            'progress' => $progress,
            'reward' => $challenge->mode === 'solo' ? [
                'state' => $challenge->reward_claimed_at ? 'claimed' : ($progress['completed_goal_days'] === 7 ? 'available' : 'locked'),
                'type' => $challenge->reward_type,
                'amount' => $challenge->reward_amount,
            ] : null,
        ];
    }

    private function progress(HydrationChallenge $challenge, User $user): array
    {
        $timezone = $challenge->timezone;
        $startsOn = $challenge->starts_at->setTimezone($timezone)->startOfDay();
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $goals = HydrationGoal::query()->where('user_id', $user->id)
            ->whereDate('starts_on', '<=', $startsOn->addDays(6)->toDateString())
            ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $startsOn->toDateString()))
            ->latest('starts_on')->get();
        // A solo challenge includes today's hydration; group logs only count
        // from midnight tomorrow in the group's timezone.
        $logs = HydrationLog::query()->where('user_id', $user->id)
            ->where('occurred_at', '>=', $startsOn->utc())
            ->where('occurred_at', '<', $challenge->ends_at)
            ->where('occurred_at', '<=', CarbonImmutable::now('UTC'))->get()
            ->groupBy(fn (HydrationLog $log): string => $log->occurred_at->setTimezone($timezone)->toDateString());
        $days = [];
        for ($index = 0; $index < 7; $index++) {
            $date = $startsOn->addDays($index);
            $goal = $goals->first(fn (HydrationGoal $candidate): bool => $candidate->starts_on->toDateString() <= $date->toDateString()
                && ($candidate->ends_on === null || $candidate->ends_on->toDateString() >= $date->toDateString()))?->daily_goal_ml ?? 2000;
            $total = (int) ($logs->get($date->toDateString())?->sum('amount_ml') ?? 0);
            $state = $date->greaterThan($today) ? 'future' : ($total >= $goal ? 'goal_achieved' : ($date->lessThan($today) ? 'missed' : ($total > 0 ? 'in_progress' : 'no_record')));
            $days[] = [
                'date' => $date->toDateString(), 'weekday' => $date->isoWeekday(), 'state' => $state,
                'total_ml' => $total, 'goal_ml' => $goal, 'percentage' => min(100, (int) round($total / max(1, $goal) * 100)),
                'is_today' => $date->isSameDay($today), 'is_trophy' => false, 'protection' => null,
            ];
        }

        return [
            'mode' => 'challenge', 'starts_on' => $startsOn->toDateString(), 'ends_on' => $startsOn->addDays(6)->toDateString(),
            'current_date' => $today->toDateString(), 'timezone' => $timezone,
            'completed_goal_days' => collect($days)->where('state', 'goal_achieved')->count(),
            'total_ml' => collect($days)->sum('total_ml'), 'days' => $days,
        ];
    }
}
