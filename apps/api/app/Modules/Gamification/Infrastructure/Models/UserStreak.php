<?php

namespace App\Modules\Gamification\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;

class UserStreak extends Model
{
    public $timestamps = false;

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['user_id', 'current_streak', 'longest_streak', 'last_hydration_date', 'updated_at'];

    protected function casts(): array
    {
        return ['last_hydration_date' => 'immutable_date', 'updated_at' => 'immutable_datetime'];
    }
}
