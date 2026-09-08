<?php

namespace App\Modules\Group\Infrastructure\Models;

use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationChallenge;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupChallengeParticipant extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = [
        'challenge_id', 'user_id', 'goal_ml', 'final_progress', 'points_hundredths', 'rank', 'tied',
        'medal', 'reward_type', 'reward_amount', 'reward_granted_at',
    ];

    protected function casts(): array
    {
        return [
            'goal_ml' => 'integer', 'final_progress' => 'array', 'points_hundredths' => 'integer',
            'rank' => 'integer', 'tied' => 'boolean', 'reward_amount' => 'integer', 'reward_granted_at' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function challenge(): BelongsTo
    {
        return $this->belongsTo(HydrationChallenge::class, 'challenge_id');
    }
}
