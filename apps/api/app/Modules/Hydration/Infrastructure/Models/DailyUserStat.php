<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DailyUserStat extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'local_date',
        'total_ml',
        'goal_ml_snapshot',
        'goal_achieved_at',
        'xp_earned',
        'xp_multiplier',
        'record_xp_earned',
        'log_count',
    ];

    protected function casts(): array
    {
        return [
            'xp_multiplier' => 'integer',
            'local_date' => 'immutable_date',
            'goal_achieved_at' => 'immutable_datetime',
        ];
    }
}
