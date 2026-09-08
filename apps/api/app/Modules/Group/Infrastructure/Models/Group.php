<?php

namespace App\Modules\Group\Infrastructure\Models;

use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['owner_id', 'name', 'timezone', 'invite_code', 'invite_code_hash', 'invite_expires_at', 'photo_review_enabled'];

    protected $hidden = ['invite_code', 'invite_code_hash'];

    protected function casts(): array
    {
        return ['photo_review_enabled' => 'boolean', 'invite_code' => 'encrypted', 'invite_expires_at' => 'immutable_datetime'];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class);
    }

    protected static function booted(): void
    {
        static::deleting(function (Group $group): void {
            if (! $group->isForceDeleting()) {
                $group->memberships()->delete();
                HydrationChallenge::query()->where('group_id', $group->id)->where('ends_at', '>', now())->update(['cancelled_at' => now()]);
                PotionUsageBlock::query()->whereIn('context_id', HydrationChallenge::query()->select('id')->where('group_id', $group->id))->delete();
                GroupChallengeParticipant::query()->whereIn('challenge_id', HydrationChallenge::query()->select('id')->where('group_id', $group->id))->delete();
                HydrationChallenge::query()->where('group_id', $group->id)->delete();
            }
        });
    }
}
