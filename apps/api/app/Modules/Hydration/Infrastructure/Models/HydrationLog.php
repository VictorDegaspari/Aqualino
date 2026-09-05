<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
    ];

    protected function casts(): array
    {
        return [
            'xp_multiplier' => 'integer',
            'occurred_at' => 'immutable_datetime',
            'local_date' => 'immutable_date',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
