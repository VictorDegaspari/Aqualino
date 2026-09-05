<?php

namespace App\Modules\Group\Infrastructure\Models;

use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['owner_id', 'name', 'timezone', 'invite_code', 'invite_code_hash', 'invite_expires_at'];

    protected $hidden = ['invite_code', 'invite_code_hash'];

    protected function casts(): array
    {
        return ['invite_code' => 'encrypted', 'invite_expires_at' => 'immutable_datetime'];
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
                HydrationChallenge::query()->where('group_id', $group->id)->delete();
            }
        });
    }
}
