<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HydrationLogVote extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['hydration_log_id', 'user_id', 'is_valid'];

    protected function casts(): array
    {
        return ['is_valid' => 'boolean'];
    }
}
