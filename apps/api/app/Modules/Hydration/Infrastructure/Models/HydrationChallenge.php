<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use App\Modules\Group\Infrastructure\Models\GroupChallengeParticipant;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HydrationChallenge extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['user_id', 'group_id', 'mode', 'timezone', 'starts_at', 'ends_at', 'reward_type', 'reward_amount', 'reward_claimed_at', 'rules', 'roster_locked_at', 'finalized_at', 'cancelled_at'];

    public function participants(): HasMany
    {
        return $this->hasMany(GroupChallengeParticipant::class, 'challenge_id');
    }

    protected function casts(): array
    {
        return [
            'rules' => 'array',
            'roster_locked_at' => 'immutable_datetime',
            'finalized_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'reward_claimed_at' => 'immutable_datetime',
            'reward_amount' => 'integer',
        ];
    }
}
