<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;

class DailyUserStat extends Model
{
    protected $fillable = [
        'user_id',
        'local_date',
        'total_ml',
        'goal_ml_snapshot',
        'goal_achieved_at',
        'xp_earned',
        'record_xp_earned',
        'log_count',
    ];

    protected function casts(): array
    {
        return [
            'local_date' => 'immutable_date',
            'goal_achieved_at' => 'immutable_datetime',
        ];
    }
}
