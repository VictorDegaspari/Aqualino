<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Group\Infrastructure\Models\Group;
use App\Modules\Group\Infrastructure\Models\GroupMembership;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Hydration\Infrastructure\Models\HydrationLogVote;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HydrationReviewService
{
    public const VOTING_HOURS = 12;

    public function __construct(private readonly RecalculateHydrationDay $recalculate) {}

    public function snapshot(User $author, CarbonImmutable $occurredAt): array
    {
        $membership = GroupMembership::withTrashed()->where('user_id', $author->id)
            ->where('created_at', '<=', $occurredAt)
            ->where(fn ($query) => $query->whereNull('deleted_at')->orWhere('deleted_at', '>', $occurredAt))
            ->latest('created_at')->first();
        if (! $membership) {
            return [];
        }
        $group = Group::withTrashed()->whereKey($membership->group_id)->lockForUpdate()->firstOrFail();
        if (! $group->photo_review_enabled || $group->trashed()) {
            return [];
        }
        $members = GroupMembership::withTrashed()->where('group_id', $membership->group_id)
            ->where('created_at', '<=', $occurredAt)
            ->where(fn ($query) => $query->whereNull('deleted_at')->orWhere('deleted_at', '>', $occurredAt))
            ->whereHas('user')->pluck('user_id')->unique()->values();
        if ($members->count() <= 2) {
            return [];
        }

        return [
            'review_group_id' => $membership->group_id,
            'eligible_voter_ids' => $members->reject(fn ($id) => $id === $author->id)->values()->all(),
            'review_expires_at' => CarbonImmutable::now('UTC')->addHours(self::VOTING_HOURS),
        ];
    }

    public function forUser(User $viewer): LengthAwarePaginator
    {
        $groupId = GroupMembership::query()->where('user_id', $viewer->id)->value('group_id');

        return HydrationLog::query()->whereNotNull('review_group_id')->where('review_group_id', $groupId)
            ->where(fn ($query) => $query->where('user_id', $viewer->id)->orWhereJsonContains('eligible_voter_ids', $viewer->id))
            ->with(['user.profile', 'votes' => fn ($query) => $query->withTrashed()])
            ->latest('created_at')->latest('id')->paginate(20);
    }

    public function findVisible(User $viewer, string $id): HydrationLog
    {
        $log = HydrationLog::query()->with(['user.profile', 'votes' => fn ($query) => $query->withTrashed()])->findOrFail($id);
        $this->authorizeView($viewer, $log);

        return $log;
    }

    public function vote(User $voter, string $id, bool $isValid): array
    {
        $visible = $this->findVisible($voter, $id);
        abort_if($visible->user_id === $voter->id, 403, 'Você não pode votar na própria marcação.');

        return DB::transaction(function () use ($voter, $visible, $isValid): array {
            Group::query()->whereKey($visible->review_group_id)->lockForUpdate()->firstOrFail();
            $author = User::query()->whereKey($visible->user_id)->lockForUpdate()->firstOrFail()->load('profile');
            $log = HydrationLog::query()->whereKey($visible->id)->lockForUpdate()->firstOrFail();
            $this->authorizeView($voter, $log);
            $previous = HydrationLogVote::withTrashed()->where('hydration_log_id', $log->id)->where('user_id', $voter->id)->first();
            if ($previous) {
                if ($previous->is_valid !== $isValid) {
                    throw ValidationException::withMessages(['vote' => ['Seu voto já foi registrado e não pode ser alterado.']]);
                }

                return $this->payload($log, $voter);
            }
            if (! $log->review_expires_at || $log->review_closed_at || now()->greaterThanOrEqualTo($log->review_expires_at)) {
                throw ValidationException::withMessages(['vote' => ['A votação desta marcação já foi encerrada.']]);
            }
            $log->votes()->create(['user_id' => $voter->id, 'is_valid' => $isValid]);
            $votes = $log->votes()->withTrashed()->get();
            $invalid = $votes->where('is_valid', false)->count();
            if ($invalid * 2 > count($log->eligible_voter_ids)) {
                $log->update(['invalidated_at' => now(), 'review_closed_at' => now(), 'xp_awarded' => 0]);
                $this->recalculate->handle($author, $log->local_date->toDateString());
            } elseif ($votes->count() === count($log->eligible_voter_ids)) {
                $log->update(['review_closed_at' => now()]);
            }

            return $this->payload($log, $voter);
        }, 3);
    }

    public function payload(HydrationLog $log, User $viewer): array
    {
        $log->loadMissing(['user.profile', 'votes' => fn ($query) => $query->withTrashed()]);
        $eligible = count($log->eligible_voter_ids ?? []);
        $invalid = $log->votes->where('is_valid', false)->count();
        $valid = $log->votes->where('is_valid', true)->count();
        $ownVote = $log->votes->firstWhere('user_id', $viewer->id);
        $closed = $log->review_closed_at || ! $log->review_expires_at || now()->greaterThanOrEqualTo($log->review_expires_at);

        return [
            'id' => $log->id, 'user_id' => $log->user_id,
            'display_name' => $log->user?->profile?->display_name ?? 'Conta excluída',
            'avatar_url' => $log->user?->profile?->avatar_url,
            'amount_ml' => $log->amount_ml, 'occurred_at' => $log->occurred_at->utc()->toIso8601String(),
            'photo_path' => $log->photo_path ? '/hydration/logs/'.$log->id.'/photo' : null,
            'status' => $log->invalidated_at ? 'invalid' : ($closed ? 'valid' : 'pending'),
            'expires_at' => $log->review_expires_at?->utc()->toIso8601String(),
            'invalidated_at' => $log->invalidated_at?->utc()->toIso8601String(),
            'eligible_voters' => $eligible, 'invalid_votes_required' => intdiv($eligible, 2) + 1,
            'valid_votes' => $valid, 'invalid_votes' => $invalid, 'abstentions' => max(0, $eligible - $valid - $invalid),
            'your_vote' => $ownVote ? ($ownVote->is_valid ? 'valid' : 'invalid') : null,
            'can_vote' => ! $closed && ! $ownVote && $viewer->id !== $log->user_id
                && in_array($viewer->id, $log->eligible_voter_ids ?? [], true),
        ];
    }

    private function authorizeView(User $viewer, HydrationLog $log): void
    {
        if ($viewer->id === $log->user_id) {
            return;
        }
        abort_unless(in_array($viewer->id, $log->eligible_voter_ids ?? [], true)
            && Group::query()->whereKey($log->review_group_id)->exists()
            && GroupMembership::query()->where('group_id', $log->review_group_id)->where('user_id', $viewer->id)->exists(), 404);
    }
}
