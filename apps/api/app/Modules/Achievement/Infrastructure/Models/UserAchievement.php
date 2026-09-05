<?php

namespace App\Modules\Achievement\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserAchievement extends Model
{
    use HasUlids, SoftDeletes;

    public $timestamps = false;

    protected $fillable = ['user_id', 'code', 'unlocked_at', 'celebrated_at'];

    protected function casts(): array
    {
        return ['unlocked_at' => 'immutable_datetime', 'celebrated_at' => 'immutable_datetime'];
    }
}
