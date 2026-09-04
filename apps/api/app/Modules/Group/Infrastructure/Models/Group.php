<?php

namespace App\Modules\Group\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Group extends Model
{
    use HasUlids;

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
}
