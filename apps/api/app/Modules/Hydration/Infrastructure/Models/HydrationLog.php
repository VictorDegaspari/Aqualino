<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HydrationLog extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'amount_ml',
        'occurred_at',
        'local_date',
        'timezone_at_event',
        'source',
        'client_event_id',
        'xp_awarded',
        'xp_multiplier',
        'metadata',
        'review_group_id', 'eligible_voter_ids', 'review_expires_at', 'review_closed_at',
        'invalidated_at', 'photo_path', 'photo_mime',
    ];

    protected $hidden = ['photo_path', 'photo_mime', 'eligible_voter_ids'];

    protected function casts(): array
    {
        return [
            'xp_multiplier' => 'integer',
            'occurred_at' => 'immutable_datetime',
            'local_date' => 'immutable_date',
            'metadata' => 'array',
            'eligible_voter_ids' => 'array',
            'review_expires_at' => 'immutable_datetime',
            'review_closed_at' => 'immutable_datetime',
            'invalidated_at' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(HydrationLogVote::class);
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->whereNull('invalidated_at');
    }

    public function scopeAwaitingReview(Builder $query): Builder
    {
        return $query->whereNotNull('review_expires_at')->whereNull('review_closed_at')
            ->where('review_expires_at', '>', now());
    }
}
