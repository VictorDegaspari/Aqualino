<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HydrationChallenge extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['user_id', 'group_id', 'mode', 'timezone', 'starts_at', 'ends_at', 'reward_type', 'reward_amount', 'reward_claimed_at'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'reward_claimed_at' => 'immutable_datetime',
            'reward_amount' => 'integer',
        ];
    }
}
